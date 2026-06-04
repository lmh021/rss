import React, { useState } from "react";
import { Story } from "../types";
import { ExternalLink, Youtube, Play, Target, Eye, Calendar, Sparkles, Newspaper } from "lucide-react";

interface StoryCardProps {
  story: Story;
  index: number;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, index }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [videoImgError, setVideoImgError] = useState(false);
  const [miniImgError, setMiniImgError] = useState(false);

  // Formatting published date
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Earlier";
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const numPrefix = String(index + 1).padStart(2, "0");

  const isPlaceholderUrl = (url?: string) => {
    if (!url) return true;
    return url.includes("photo-1504711434969-e33886168f5c"); // corporate newspaper stock photo
  };

  const displayThumbnail = !isPlaceholderUrl(story.itemThumbnailUrl) 
    ? story.itemThumbnailUrl 
    : (story.youtubeThumbnailUrl || `https://img.youtube.com/vi/${story.youtubeVideoId}/mqdefault.jpg`);

  const isLeftColumn = story.id.startsWith("digg");

  return (
    <div
      id={`story-card-${story.id}`}
      className="group relative flex flex-col justify-between overflow-hidden border border-[#1A1A1A] bg-white p-6 shadow-[3px_3px_0px_#1A1A1A] transition-all duration-300 hover:shadow-[5px_5px_0px_#1A1A1A] hover:-translate-y-0.5"
    >
      {isLeftColumn ? (
        /* Left Column (News): High-fidelity, highly compact neat layout */
        <div>
          {/* Header meta line */}
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3 mb-4 w-full">
            {story.category && (
              <span className="bg-[#E63946] px-2.5 py-0.5 text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#F5F2ED] shadow-[1.5px_1.5px_0px_#1A1A1A]">
                {story.category}
              </span>
            )}
            <span className="font-sans text-[10px] font-black text-[#1A1A1A] tracking-widest bg-[#EBE7E0] border border-[#1A1A1A] px-2 py-0.5">
              INDEX #{numPrefix}
            </span>
          </div>

          {/* Compact visual thumbnail right above the news headline */}
          <div className="mb-3.5 relative w-36 h-22 overflow-hidden border border-[#1A1A1A] bg-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center p-2 text-center text-[10px] font-mono select-none">
            {!imgError ? (
              <img
                src={displayThumbnail}
                alt={story.title}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                <Newspaper className="h-4 w-4 text-[#E63946]" />
                <span className="text-[8px] uppercase font-sans tracking-tight font-black">{story.category || "News"}</span>
              </div>
            )}
          </div>

          {/* Publish time */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-sans tracking-tight font-bold text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-[#E63946]" />
              <span>{formatDate(story.publishedAt)} &bull; {formatTime(story.publishedAt)}</span>
            </span>
          </div>
        </div>
      ) : (
        /* Right Column (Gear/Style): Expansive visual hero banner layout */
        <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/9] w-[calc(100%+3rem)] overflow-hidden border-b border-[#1A1A1A] bg-[#1A1A1A] flex items-center justify-center">
          {!imgError ? (
            <img
              src={displayThumbnail}
              alt={story.title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center max-w-xs text-[#F5F2ED]">
              <Sparkles className="h-6 w-6 text-[#E63946]" />
              <span className="text-xs font-sans font-black uppercase tracking-widest">{story.category || "Gear & Style"}</span>
              <span className="text-[10px] font-serif italic opacity-80 line-clamp-2">{story.title}</span>
            </div>
          )}
          {story.category && (
            <span className="absolute left-4 top-4 bg-[#E63946] px-2.5 py-0.5 text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#F5F2ED] shadow-[2px_2px_0px_#1A1A1A]">
              {story.category}
            </span>
          )}
          
          {/* Decorative Index Label inside image header */}
          <div className="absolute right-0 top-0 border-l border-b border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] px-3.5 py-1.5 font-sans text-xs font-black tracking-widest">
            #{numPrefix}
          </div>
        </div>
      )}

      <div>
        {!isLeftColumn && (
          /* Publish time for Right Column (already embedded in header for Left Column) */
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-sans tracking-tight font-bold text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-[#E63946]" />
              <span>{formatDate(story.publishedAt)} &bull; {formatTime(story.publishedAt)}</span>
            </span>
          </div>
        )}

        {/* Story Title - Playfair Serif design */}
        <h3 className="mb-3 font-serif text-lg font-black leading-tight text-[#1A1A1A] hover:text-[#E63946] transition-colors font-bold">
          <a href={story.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2">
            {story.title}
          </a>
        </h3>

        {/* Story Summary */}
        <p className="mb-5 font-serif text-xs leading-relaxed text-[#1A1A1A]/80 line-clamp-3 italic">
          "{story.summary}"
        </p>

        {/* Engagement Benchmarks */}
        <div className="mb-6 flex items-center justify-between border-y border-[#1A1A1A]/20 py-2.5 font-sans text-[11px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest">
          <div className="flex items-center gap-1.5" title="Estimated reach metric">
            <Eye className="h-4 w-4 text-[#1A1A1A]/60" />
            <span className="text-[#1A1A1A]">{story.viewsCount.toLocaleString()}</span>
            <span className="text-slate-400">reach</span>
          </div>

          <div className="flex items-center gap-1.5" title="Trending Power score index">
            <Target className="h-4 w-4 text-[#E63946]" />
            <span className="text-[#1A1A1A]">{story.trendingScore}%</span>
            <span className="bg-[#1A1A1A] text-white px-1 py-0.5 text-[9px] font-extrabold">
              power
            </span>
          </div>
        </div>
      </div>

        {/* Recommended Video Embed */}
      <div className="mt-auto space-y-4">
        <label className="block font-sans text-[10px] font-extrabold tracking-widest text-[#1A1A1A]/60 uppercase">
          &bull; Coverage Segment
        </label>

        {isPlaying ? (
          <div className="relative aspect-video w-full overflow-hidden border border-[#1A1A1A] bg-black shadow-inner">
            <iframe
              src={`https://www.youtube.com/embed/${story.youtubeVideoId}?autoplay=1&rel=0`}
              title={story.youtubeVideoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute left-0 top-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <button
            id={`btn-play-video-${story.id}`}
            onClick={() => setIsPlaying(true)}
            className="group/video relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden border border-[#1A1A1A] bg-[#1A1A1A] transition-all focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            title="Click to stream YouTube coverage"
          >
            {/* Thumbnail */}
            {!videoImgError ? (
              <img
                src={displayThumbnail}
                alt={story.title}
                onError={() => setVideoImgError(true)}
                className="absolute left-0 top-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover/video:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-slate-800 to-[#1A1A1A] flex flex-col items-center justify-center p-4">
                <Youtube className="h-8 w-8 text-[#E63946]" />
                <span className="text-[9px] font-sans font-black uppercase tracking-widest text-slate-400 mt-1">Live Segment Stream</span>
              </div>
            )}
            {/* Crimson overlay */}
            <div className="absolute inset-0 bg-[#E63946]/10 transition-colors duration-300 group-hover/video:bg-slate-900/60" />

            <div className="relative z-10 flex flex-col items-center gap-2 p-3 text-center w-full">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E63946] text-white shadow-md transition-transform duration-300 group-hover/video:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-auto" />
              </div>
              <span className="text-[11px] font-sans font-bold text-white drop-shadow-sm line-clamp-1 bg-[#1A1A1A]/70 px-2 py-0.5 border border-white/10 rounded-sm">
                Watch Media: {story.youtubeVideoTitle}
              </span>
              <span className="text-[9px] font-sans font-semibold text-[#F5F2ED]/90 flex items-center gap-1 justify-center uppercase tracking-widest bg-[#1A1A1A]/80 px-1.5 py-0.5 rounded-sm">
                <Youtube className="h-3.5 w-3.5 text-[#E63946]" /> {story.youtubeChannel || "YouTube"}
              </span>
            </div>
          </button>
        )}

        {/* Dynamic Clean Search Report - Requested Format Output */}
        <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 text-xs font-mono space-y-2 text-[#1A1A1A] shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
          <div className="text-[9px] uppercase font-sans tracking-wider font-extrabold text-[#E63946] border-b border-[#1A1A1A]/10 pb-1.5 mb-1.5">
            // MATCHED YOUTUBE OBJECT DETAILS
          </div>
          <div className="leading-snug">
            <span className="font-bold text-slate-600">- **Video Title:**</span> {story.youtubeVideoTitle || "[Insert Title]"}
          </div>
          <div className="leading-snug">
            <span className="font-bold text-slate-600">- **Source Channel:**</span> {story.youtubeChannel || "[Insert Channel]"}
          </div>
          <div className="leading-snug flex flex-wrap gap-1">
            <span className="font-bold text-slate-600">- **Watch Link:**</span> 
            <a 
              href={story.videoUrl || `https://www.youtube.com/watch?v=${story.youtubeVideoId}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline text-[#E63946] hover:text-[#1A1A1A] font-semibold break-all"
            >
              {story.videoUrl || `https://www.youtube.com/watch?v=${story.youtubeVideoId}`}
            </a>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-bold text-slate-600">- **Visual Preview:**</span>
            <div className="relative h-10 w-16 overflow-hidden border border-[#1A1A1A] bg-[#1A1A1A] rounded-sm flex items-center justify-center font-bold text-white text-[8px]">
              {!miniImgError ? (
                <img 
                  src={story.youtubeThumbnailUrl || `https://img.youtube.com/vi/${story.youtubeVideoId}/mqdefault.jpg`} 
                  alt="Thumbnail" 
                  onError={() => setMiniImgError(true)}
                  className="h-full w-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Youtube className="h-4 w-4 text-[#E63946]" />
              )}
            </div>
          </div>
        </div>

        {/* Read original report link - touch target 44px min */}
        <div className="pt-1">
          <a
            id={`link-article-${story.id}`}
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 border border-[#1A1A1A] bg-[#EBE7E0] text-xs font-sans font-black uppercase tracking-widest text-[#1A1A1A] transition-all hover:bg-[#1A1A1A] hover:text-[#F5F2ED] active:translate-y-0.5"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Original Report</span>
          </a>
        </div>
      </div>
    </div>
  );
};
