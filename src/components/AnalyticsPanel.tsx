import React, { useMemo } from "react";
import { Story } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Table, Eye, Target, Sparkles, Newspaper } from "lucide-react";

interface AnalyticsPanelProps {
  diggStories: Story[];
  cbsStories: Story[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  diggStories,
  cbsStories,
}) => {
  // Combine all stories
  const allStories = useMemo(() => {
    const diggMapped = diggStories.map((s) => ({ ...s, source: "CBS Main News" }));
    const cbsMapped = cbsStories.map((s) => ({ ...s, source: "Uncrate Gear & Style" }));
    return [...diggMapped, ...cbsMapped];
  }, [diggStories, cbsStories]);

  // Chart 1: Bar chart comparing Top 8 Stories by Trending Score
  const barChartData = useMemo(() => {
    return [...allStories]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 8)
      .map((story) => ({
        shortTitle: story.title.length > 20 ? story.title.slice(0, 20) + "..." : story.title,
        title: story.title,
        Score: story.trendingScore,
        Reach: story.viewsCount,
        source: story.source,
      }));
  }, [allStories]);

  // Chart 2: Category Distribution
  const categoryData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    allStories.forEach((s) => {
      const cat = s.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map((name) => ({
      name,
      value: counts[name],
    }));
  }, [allStories]);

  // Editorial palette for Pie cells
  const COLORS = ["#E63946", "#1A1A1A", "#8A1521", "#4A4A4A", "#96232D", "#2E3A4E", "#D48C00", "#555555"];

  // Reach Statistics
  const stats = useMemo(() => {
    const totalDiggViews = diggStories.reduce((acc, s) => acc + s.viewsCount, 0);
    const totalCbsViews = cbsStories.reduce((acc, s) => acc + s.viewsCount, 0);
    const avgDiggScore = diggStories.reduce((acc, s) => acc + s.trendingScore, 0) / (diggStories.length || 1);
    const avgCbsScore = cbsStories.reduce((acc, s) => acc + s.trendingScore, 0) / (cbsStories.length || 1);

    return {
      totalDiggViews,
      totalCbsViews,
      avgDiggScore: Math.round(avgDiggScore),
      avgCbsScore: Math.round(avgCbsScore),
    };
  }, [diggStories, cbsStories]);

  return (
    <div className="space-y-8" id="analytics-panel-root">
      
      {/* High level micro metrics bar - with heavy editorial border and parchment background */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="flex items-center gap-4 border border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#EBE7E0] border border-[#1A1A1A] text-[#E63946]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-500 uppercase">CBS Main Agg. Reach</p>
            <h4 className="font-serif text-xl font-extrabold text-[#1A1A1A]">
              {stats.totalDiggViews.toLocaleString()}
            </h4>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="flex items-center gap-4 border border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#EBE7E0] border border-[#1A1A1A] text-slate-800">
            <Newspaper className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-500 uppercase">Uncrate Gear Aggregate Reach</p>
            <h4 className="font-serif text-xl font-extrabold text-[#1A1A1A]">
              {stats.totalCbsViews.toLocaleString()}
            </h4>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="flex items-center gap-4 border border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#EBE7E0] border border-[#1A1A1A] text-[#E63946]">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-500 uppercase">CBS Main Avg. Power</p>
            <h4 className="font-serif text-xl font-extrabold text-[#1A1A1A]">
              {stats.avgDiggScore}% <span className="font-sans text-[10px] font-bold text-slate-400">power</span>
            </h4>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="flex items-center gap-4 border border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#EBE7E0] border border-[#1A1A1A] text-slate-800">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-black tracking-widest text-slate-500 uppercase">Uncrate Avg. Gear Interest</p>
            <h4 className="font-serif text-xl font-extrabold text-[#1A1A1A]">
              {stats.avgCbsScore}% <span className="font-sans text-[10px] font-bold text-slate-400">power</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Main Comparative level - sits comfortably side by side on desktop and tablet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Editorial Table */}
        <div className="border border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A]">
          <div className="mb-5 flex items-center gap-2 border-b border-[#1A1A1A] pb-3">
            <Table className="h-5 w-5 text-[#E63946]" />
            <h3 className="font-serif text-lg font-black tracking-tight text-[#1A1A1A]">
              Index Catalog Comparison
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans text-slate-600">
              <thead className="bg-[#EBE7E0] text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Subject Matter Text</th>
                  <th className="px-4 py-3 text-right">Reach</th>
                  <th className="px-4 py-3 text-right">Power</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/10 font-serif">
                {allStories
                  .sort((a, b) => b.trendingScore - a.trendingScore)
                  .map((story) => (
                    <tr
                      key={story.id}
                      className="hover:bg-[#F5F2ED] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-sans font-black uppercase tracking-wider ${
                            story.source === "CBS Main News"
                              ? "bg-[#E63946] text-white"
                              : "bg-[#1A1A1A] text-white"
                          }`}
                        >
                          {story.source === "CBS Main News" ? "CBS Main" : "Uncrate Gear"}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-semibold text-[#1A1A1A]">
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-[#E63946]"
                        >
                          {story.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 text-[11px]">
                        {story.viewsCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-sans font-black text-[#E63946]">
                          {story.trendingScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Charts Block (sits side-by-side with Table on Tablet/Desktop) */}
        <div className="space-y-8">
          
          {/* Chart Card 1: Power index comparison */}
          <div className="border border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A]">
            <h4 className="mb-4 font-serif text-sm font-black text-[#1A1A1A] uppercase tracking-wider pb-2 border-b border-dashed border-[#1A1A1A]/20">
              Top Stories Power Index (Score %)
            </h4>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="shortTitle" tick={{ fontSize: 9, fontFamily: 'serif' }} stroke="#1A1A1A" />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 9 }} stroke="#1A1A1A" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1A1A",
                      border: "1px solid #1A1A1A",
                      color: "#F5F2ED",
                      fontSize: "11px",
                      fontFamily: "serif",
                    }}
                  />
                  <Bar dataKey="Score" radius={[0, 0, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.source === "CBS Main News" ? "#E63946" : "#1A1A1A"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-5 font-sans text-[10px] font-black tracking-widest uppercase">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 bg-[#E63946] border border-[#1A1A1A]"></span>
                CBS Main News Metrics
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 bg-[#1A1A1A]"></span>
                Uncrate Gear Metrics
              </span>
            </div>
          </div>

          {/* Chart Card 2: Distributions of Categories */}
          <div className="border border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0px_#1A1A1A]">
            <h4 className="mb-3 font-serif text-sm font-black text-[#1A1A1A] uppercase tracking-wider pb-2 border-b border-dashed border-[#1A1A1A]/20">
              Aggregated Coverage Distribution
            </h4>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-[140px] w-full max-w-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1A1A",
                        color: "#F5F2ED",
                        borderRadius: "0px",
                        border: "1px solid #1A1A1A",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Legends with structured design */}
              <div className="flex flex-wrap gap-2.5 sm:flex-1">
                {categoryData.map((entry, index) => (
                  <span
                    key={entry.name}
                    className="flex items-center gap-2 text-xs font-sans font-bold text-[#1A1A1A]"
                  >
                    <span
                      className="inline-block h-3 w-3 border border-[#1A1A1A]"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-serif italic">{entry.name}</span>
                    <span className="bg-[#EBE7E0] text-[9.5px] px-1.5 py-0.5 rounded-none font-black border border-[#1A1A1A]/30">
                      {entry.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
