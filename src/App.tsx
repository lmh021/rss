import { useState, useEffect } from "react";
import { Story, DualFeedData } from "./types";
import { StoryCard } from "./components/StoryCard";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { RssSuggestionsList } from "./components/RssSuggestionsList";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Newspaper, 
  Activity, 
  Sparkles, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Compass, 
  BookOpen
} from "lucide-react";

export default function App() {
  const [data, setData] = useState<DualFeedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Dynamically default to the current system date in ISO format
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "digg" | "cbs" | "analytics">("all");
  const [dataSource, setDataSource] = useState<string>("live");

  // Fetch stories data from local full-stack server
  const fetchStories = async (dateVal: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/stories?date=${dateVal}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }
      const json = await response.json();
      if (json.success) {
        // Limit results to top 10 as strictly requested
        setData({
          diggStories: json.diggStories?.slice(0, 10) || [],
          cbsStories: json.cbsStories?.slice(0, 10) || [],
          cutoffDate: json.cutoffDate || "Previous Day 23:59",
        });
        setDataSource(json.source || "gemini-grounded");
      } else {
        throw new Error(json.error || "Failed to successfully query stories");
      }
    } catch (err: any) {
      console.error("[Client] Failed to load data", err);
      setError(err.message || "An unexpected error occurred while fetching news feeds");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories(selectedDate);
  }, [selectedDate]);

  // Apply search filtering
  const filterStories = (stories: Story[]) => {
    if (!searchTerm) return stories;
    const query = searchTerm.toLowerCase();
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query) ||
        (s.category && s.category.toLowerCase().includes(query))
    );
  };

  const diggFiltered = data ? filterStories(data.diggStories) : [];
  const cbsFiltered = data ? filterStories(data.cbsStories) : [];

  // Simulate PDF download/export action
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F5F2ED] text-[#1A1A1A] font-serif overflow-x-hidden antialiased select-none">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen">
        
        {/* 2. Top Header Block */}
        <header className="border-b border-[#1A1A1A] flex flex-col md:flex-row md:items-end justify-between px-6 md:px-10 py-6 gap-6 bg-[#EBE7E0]">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#E63946] text-[#F5F2ED] font-sans text-[10px] font-black uppercase tracking-widest">
                Trending Daily
              </span>
              <span className="text-[10px] font-sans font-extrabold text-[#1A1A1A]/60 tracking-wider">
                ISSUE #{selectedDate.replace(/-/g, "")}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif font-black uppercase leading-none tracking-tighter text-[#1A1A1A]">
              The Dual <span className="text-[#E63946] italic">Report</span>
            </h1>
            
            <p className="font-sans text-[11px] text-[#1A1A1A]/70 uppercase tracking-widest font-bold">
              cbsnews.com/latest/rss/main &bull;&nbsp;uncrate.com/feed &bull;&nbsp;Youtube Coverage
            </p>
          </div>

          {/* Interactive panel - date, refresh controls */}
          <div className="flex flex-wrap items-center gap-3 font-sans shrink-0">
            {/* Quick date picker - touch target h-11 = 44px min */}
            <div className="flex items-center border border-[#1A1A1A] bg-white h-11 px-3">
              <CalendarIcon className="h-4 w-4 mr-2 text-[#E63946]" />
              <input
                id="date-picker-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black uppercase tracking-widest text-[#1A1A1A] focus:outline-none cursor-pointer h-full"
                max="2026-12-31"
                min="2026-05-01"
              />
            </div>

            {/* Manual refresh action */}
            <button
              id="btn-manual-refresh"
              onClick={() => fetchStories(selectedDate)}
              className="h-11 w-11 flex items-center justify-center border border-[#1A1A1A] bg-white hover:bg-[#EBE7E0] transition-colors"
              title="Re-query latest trending metrics"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-[#1A1A1A] ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

        </header>

        {/* 3. Filtering and search toolbar - with exact 44px touch target controls */}
        <section className="bg-white border-b border-[#1A1A1A] px-6 md:px-10 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Section view controllers */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Dual Column Feed", icon: BookOpen },
              { id: "digg", label: "CBS News Main Only", icon: Sparkles },
              { id: "cbs", label: "Uncrate Gear Only", icon: Newspaper },
              { id: "analytics", label: "Analytics & Charts", icon: Activity }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-11 px-4 flex items-center gap-2 border border-[#1A1A1A] font-sans text-xs font-extrabold uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? "bg-[#1A1A1A] text-[#F5F2ED] shadow-[2px_2px_0px_#E63946]"
                      : "bg-[#F5F2ED] text-[#1A1A1A] hover:bg-white"
                  }`}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Term Filter Input - touch target 44px min */}
          <div className="relative font-sans max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              id="search-stories-input"
              type="text"
              placeholder="Search current day indexes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] border border-[#1A1A1A] bg-[#F5F2ED] placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1A1A1A] transition-all"
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 font-sans text-[10px] font-black text-slate-400 hover:text-[#1A1A1A]"
                onClick={() => setSearchTerm("")}
              >
                Clear
              </button>
            )}
          </div>

        </section>

        {/* 4. Archive Cutoff & Feed Metadata Info */}
        <section className="bg-[#EBE7E0]/60 border-b border-[#1A1A1A]/20 px-6 md:px-10 py-3 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-2 font-sans tracking-wide">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold uppercase text-[10px] tracking-wider text-[#1A1A1A]/60">Verified Archive Base Date:</span>
            <span className="font-extrabold uppercase bg-white border border-[#1A1A1A]/20 px-1.5 py-0.5 text-[#E63946] text-[10px]">
              {data?.cutoffDate || "Previous Day 23:59"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Query Date: <strong className="text-[#1A1A1A]">{selectedDate}</strong></span>
          </div>
        </section>

        {/* 5. Main Content Deck */}
        <div className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <RefreshCw className="h-10 w-10 text-[#E63946] animate-spin" />
              <p className="font-serif italic text-lg text-slate-500 animate-pulse">
                Assembling dual sources... querying search grounding indexes...
              </p>
            </div>
          ) : error ? (
            <div className="border border-[#1A1A1A] bg-white p-8 shadow-[4px_4px_0_#1A1A1A] max-w-xl mx-auto text-center space-y-4">
              <h3 className="font-serif text-xl font-black text-[#E63946]">Failed to Assemble Intelligence Grid</h3>
              <p className="text-sm font-serif italic">"{error}"</p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setSelectedDate("2026-06-01")}
                  className="h-11 px-6 border border-[#1A1A1A] bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Reset To June 1st Baseline
                </button>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Filter warning if search has zero matching reports */}
              {searchTerm && diggFiltered.length === 0 && cbsFiltered.length === 0 && (
                <div className="border border-dashed border-[#1A1A1A]/40 bg-[#EBE7E0]/30 p-8 text-center font-serif italic text-slate-500">
                  No editorial summaries found matching term "{searchTerm}". Try another search term.
                </div>
              )}

              {/* CORE FEED DISPATCH DISPLAY */}
              {activeTab === "all" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: CBS Main News */}
                  <div className="space-y-6">
                    <div className="h-14 bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-between px-6 text-[#F5F2ED] shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
                      <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#F5F2ED] flex items-center gap-2">
                        <span className="text-[#E63946] font-sans font-black not-italic text-base">01.</span>
                        CBS News / Main Headlines
                      </h2>
                      <span className="font-sans text-[10px] font-black uppercase tracking-widest bg-[#E63946] px-2 py-0.5 text-white">
                        LATEST GLOBAL FEED
                      </span>
                    </div>

                    <div className="space-y-6">
                      {diggFiltered.map((story, idx) => (
                        <StoryCard key={story.id} story={story} index={idx} />
                      ))}
                      {diggFiltered.length === 0 && !searchTerm && (
                        <p className="text-sm italic text-slate-400 font-serif">No CBS Main stories available.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: CBS News */}
                  <div className="space-y-6">
                    <div className="h-14 bg-white border border-[#1A1A1A] flex items-center justify-between px-6 text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
                      <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#1A1A1A] flex items-center gap-2">
                        <span className="text-slate-400 font-sans font-black not-italic text-base">02.</span>
                        Uncrate Gear & Style Buyers Guide
                      </h2>
                      <span className="font-sans text-[10px] font-black uppercase tracking-widest bg-[#1A1A1A] px-2 py-0.5 text-white">
                        LATEST DAILY FEED
                      </span>
                    </div>

                    <div className="space-y-6">
                      {cbsFiltered.map((story, idx) => (
                        <StoryCard key={story.id} story={story} index={idx} />
                      ))}
                      {cbsFiltered.length === 0 && !searchTerm && (
                        <p className="text-sm italic text-slate-400 font-serif">No Uncrate stories available.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* SINGLE FOCUS VIEWPORT: CBS MAIN NEWS */}
              {activeTab === "digg" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="h-14 bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-between px-6 text-[#F5F2ED] shadow-[3px_3px_0px_#E63946]">
                    <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#F5F2ED]">
                      01. CBS News Main Headlines Spotlight (Top 10)
                    </h2>
                    <span className="font-sans text-[10px] font-black bg-[#E63946] px-2.5 py-0.5 text-white uppercase">
                      Global & National
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {diggFiltered.map((story, idx) => (
                      <StoryCard key={story.id} story={story} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* SINGLE FOCUS VIEWPORT: CBS NEWS */}
              {activeTab === "cbs" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="h-14 bg-white border border-[#1A1A1A] flex items-center justify-between px-6 text-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]">
                    <h2 className="uppercase font-serif italic font-extrabold tracking-widest text-sm text-[#1A1A1A]">
                      02. Uncrate Gear Spotlight Feed (Top 10)
                    </h2>
                    <span className="font-sans text-[10px] font-black bg-[#1A1A1A] px-2.5 py-0.5 text-white uppercase">
                      Gear & Style
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cbsFiltered.map((story, idx) => (
                      <StoryCard key={story.id} story={story} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* COMPARATIVE METRICS & CHARTS TAB VIEW */}
              {activeTab === "analytics" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-[#1A1A1A] bg-[#EBE7E0] p-6 shadow-[3px_3px_0px_#1A1A1A] mb-4">
                    <h2 className="font-serif text-2xl font-black uppercase text-[#1A1A1A] mb-1">
                      Aggregated Story Visualizer Metrics
                    </h2>
                    <p className="font-serif italic text-sm text-slate-600">
                      Comparing publisher reach parameters, story strength scores, and cross-source topic category distributions.
                    </p>
                  </div>
                  <AnalyticsPanel
                    diggStories={data.diggStories}
                    cbsStories={data.cbsStories}
                  />
                </div>
              )}

              {/* Automated Reading Suggestions with Real-Time Web Search Grounding */}
              <RssSuggestionsList
                diggStories={data.diggStories}
                cbsStories={data.cbsStories}
              />
            </>
          ) : null}

        </div>

        {/* 7. Footer Status Bar - exact "Artistic Flair" styling colors & tags */}
        <footer className="h-16 mt-auto border-t border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-between px-6 md:px-10 gap-8 font-sans">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest font-black text-[#F5F2ED]">
              The Daily Digest
            </span>
          </div>

          <div className="text-[9px] uppercase tracking-[0.25em] text-center opacity-50 block truncate max-w-md">
            Source: CBSNews.com Main & Uncrate RSS &bull; YouTube Embed API
          </div>

          {/* Trigger Touch Targets: 44px min */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="btn-trigger-pdf-print"
              onClick={handleExportPDF}
              className="px-4 h-10 bg-[#F5F2ED] text-[#1A1A1A] font-sans font-black text-[10px] uppercase tracking-widest border border-[#1A1A1A] transition-colors hover:bg-[#EBE7E0] active:translate-y-0.5"
            >
              Print Digest
            </button>
          </div>
        </footer>

      </main>

    </div>
  );
}
