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
const CACHE_DURATION = 30 * 1000; // 30 seconds for faster propagation

// Debug logging for data sources
const logDataSource = (source: 'cache' | 'github' | 'local', path: string, fromCache?: boolean) => {
  const emoji = source === 'cache' ? '💾' : source === 'github' ? '🌐' : '📁';
  console.log(`${emoji} Data loaded from ${source}:`, path, fromCache ? '(cached)' : '(fresh)');
};

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

async function loadFromGitHub(path: string, config: GitHubDataConfig = DEFAULT_CONFIG, forceRefresh: boolean = false): Promise<any | null> {
  try {
    const cacheKey = `${config.owner}/${config.repo}/${config.branch}/${path}`;
    const cached = dataCache.get(cacheKey);
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logDataSource('cache', path, true);
      return cached.data;
    }

    // Add cache busting timestamp parameter
    const cacheBuster = forceRefresh ? `&t=${Date.now()}` : '';
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(config.branch)}${cacheBuster}`;
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
      logDataSource('github', path, false);
      
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
    const data = await response.json();
    logDataSource('local', path, false);
    return data;
  } catch (error) {
    console.warn(`Failed to load local file (${path}):`, error);
    return null;
  }
}

export async function loadData<T>(localPath: string, githubPath: string, forceRefresh: boolean = false): Promise<T | null> {
  // First, try to load from GitHub (latest data)
  const githubData = await loadFromGitHub(githubPath, DEFAULT_CONFIG, forceRefresh);
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

// Force refresh functions that bypass cache
export async function loadDataForced<T>(localPath: string, githubPath: string): Promise<T | null> {
  return loadData<T>(localPath, githubPath, true);
}

// Clear specific cache entry
export function clearDataCache(githubPath: string, config: GitHubDataConfig = DEFAULT_CONFIG): void {
  const cacheKey = `${config.owner}/${config.repo}/${config.branch}/${githubPath}`;
  dataCache.delete(cacheKey);
  console.log('🗑️ Cache cleared for:', githubPath);
}

// Clear all cache
export function clearAllCache(): void {
  dataCache.clear();
  console.log('🗑️ All cache cleared');
}

// Get cache info for debugging
export function getCacheInfo(githubPath: string, config: GitHubDataConfig = DEFAULT_CONFIG): { 
  cached: boolean; 
  age: number; 
  expires: number;
} | null {
  const cacheKey = `${config.owner}/${config.repo}/${config.branch}/${githubPath}`;
  const cached = dataCache.get(cacheKey);
  
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  const expires = CACHE_DURATION - age;
  
  return {
    cached: true,
    age,
    expires: Math.max(0, expires)
  };
}

// Convenience functions for specific data types
export const loadNews = (forceRefresh?: boolean) => loadData<any[]>("/content/news.json", "public/content/news.json", forceRefresh);
export const loadPromotions = (forceRefresh?: boolean) => loadData<any[]>("/content/promotions.json", "public/content/promotions.json", forceRefresh);
export const loadOpeningHours = (forceRefresh?: boolean) => loadData<any>("/content/opening-hours.json", "public/content/opening-hours.json", forceRefresh);

// Forced refresh versions
export const loadNewsForced = () => loadNews(true);
export const loadPromotionsForced = () => loadPromotions(true);
export const loadOpeningHoursForced = () => loadOpeningHours(true);

// Cache clearing for specific data types
export const clearNewsCache = () => clearDataCache("public/content/news.json");
export const clearPromotionsCache = () => clearDataCache("public/content/promotions.json");
export const clearOpeningHoursCache = () => clearDataCache("public/content/opening-hours.json");