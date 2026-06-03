export interface Story {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string; // ISO string or human date
  youtubeVideoId: string; // YouTube video ID for iframe embed
  youtubeVideoTitle: string; // Title of YouTube video
  youtubeChannel?: string; // YouTube Channel name
  viewsCount: number; // Trending metrics
  trendingScore: number; // Score between 0-100 or metric
  category?: string; // Category for classification / charts
  videoUrl?: string; // Full video URL from search result
  youtubeThumbnailUrl?: string; // Thumbnail image URL from search result
  itemThumbnailUrl?: string; // Original article/product thumbnail image URL
}

export interface DualFeedData {
  diggStories: Story[];
  cbsStories: Story[];
  cutoffDate: string;
}

export interface DashboardStats {
  totalEngagement: number;
  avgScore: number;
  topTrendStory: string;
  sourceBreakdown: { name: string; value: number }[];
  trendingDistribution: { range: string; count: number }[];
}
