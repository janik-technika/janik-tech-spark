// Shared data loading utility that loads from GitHub first, then falls back to local files

export type GitHubDataConfig = {
  owner: string;
  repo: string;
  branch: string;
};

// Default GitHub configuration for the project
const DEFAULT_CONFIG: GitHubDataConfig = {
  owner: "janik-technika",
  repo: "janik-tech-spark",
  branch: "main"
};

// Cache for GitHub data to avoid repeated API calls
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function fromBase64(base64Str: string): string {
  try {
    // Decode base64 to binary string
    const binaryStr = atob(base64Str);
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    // Decode as UTF-8
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.warn('Error decoding base64:', error);
    return base64Str; // Fallback to original string
  }
}

async function loadFromGitHub(path: string, config: GitHubDataConfig = DEFAULT_CONFIG): Promise<any | null> {
  try {
    const cacheKey = `${config.owner}/${config.repo}/${config.branch}/${path}`;
    const cached = dataCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(config.branch)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`GitHub file not found: ${path}`);
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.content) {
      const content = fromBase64(data.content);
      const parsedData = JSON.parse(content);
      
      // Cache the parsed data
      dataCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });
      
      return parsedData;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to load from GitHub (${path}):`, error);
    return null;
  }
}

async function loadFromLocal(path: string): Promise<any | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`Failed to load local file (${path}):`, error);
    return null;
  }
}

export async function loadData<T>(localPath: string, githubPath: string): Promise<T | null> {
  // First, try to load from GitHub (latest data)
  const githubData = await loadFromGitHub(githubPath);
  if (githubData !== null) {
    return githubData as T;
  }

  // Fallback to local file
  const localData = await loadFromLocal(localPath);
  if (localData !== null) {
    return localData as T;
  }

  // If both fail, return null
  return null;
}

// Convenience functions for specific data types
export const loadNews = () => loadData<any[]>("/content/news.json", "public/content/news.json");
export const loadPromotions = () => loadData<any[]>("/content/promotions.json", "public/content/promotions.json");
export const loadOpeningHours = () => loadData<any>("/content/opening-hours.json", "public/content/opening-hours.json");