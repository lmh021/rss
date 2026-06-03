import React, { useState } from "react";
import { Story } from "../types";
import { ExternalLink, Youtube, Play, Target, Eye, Calendar } from "lucide-react";

interface StoryCardProps {
  story: Story;
  index: number;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, index }) => {
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <div
      id={`story-card-${story.id}`}
      className="group relative flex flex-col justify-between overflow-hidden border border-[#1A1A1A] bg-white p-6 shadow-[3px_3px_0px_#1A1A1A] transition-all duration-300 hover:shadow-[5px_5px_0px_#1A1A1A] hover:-translate-y-0.5"
    >
      {/* Decorative Index Label - Crimson Artistic flair style */}
      <div className="absolute right-0 top-0 border-l border-b border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] px-3.5 py-1.5 font-sans text-xs font-black tracking-widest">
        #{numPrefix}
      </div>

      <div>
        {/* Category badge & Publish time */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {story.category && (
            <span className="bg-[#E63946] px-2.5 py-0.5 text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#F5F2ED]">
              {story.category}
            </span>
          )}
          
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-sans tracking-tight font-bold text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-[#E63946]" />
            <span>{formatDate(story.publishedAt)} &bull; {formatTime(story.publishedAt)}</span>
          </span>
        </div>

        {/* Story Title - Playfair Serif design */}
        <h3 className="mb-3 font-serif text-lg font-black leading-tight text-[#1A1A1A] hover:text-[#E63946] transition-colors">
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
            <img
              src={story.itemThumbnailUrl || story.youtubeThumbnailUrl || `https://img.youtube.com/vi/${story.youtubeVideoId}/mqdefault.jpg`}
              alt={story.title}
              className="absolute left-0 top-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover/video:scale-105"
              referrerPolicy="no-referrer"
            />
            {/* Crimson overlay */}
            <div className="absolute inset-0 bg-[#E63946]/10 transition-colors duration-300 group-hover/video:bg-slate-900/60" />

            <div className="relative z-10 flex flex-col items-center gap-2 p-3 text-center">
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
            <span className="font-extrabold text-slate-600">- **Video Title:**</span> {story.youtubeVideoTitle || "[Insert Title]"}
          </div>
          <div className="leading-snug">
            <span className="font-extrabold text-slate-600">- **Source Channel:**</span> {story.youtubeChannel || "[Insert Channel]"}
          </div>
          <div className="leading-snug flex flex-wrap gap-1">
            <span className="font-extrabold text-slate-600">- **Watch Link:**</span> 
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
            <span className="font-extrabold text-slate-600">- **Visual Preview:**</span>
            <div className="relative h-10 w-16 overflow-hidden border border-[#1A1A1A] bg-slate-100 rounded-sm">
              <img 
                src={story.youtubeThumbnailUrl || `https://img.youtube.com/vi/${story.youtubeVideoId}/mqdefault.jpg`} 
                alt="Thumbnail" 
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer"
              />
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
