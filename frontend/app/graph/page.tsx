"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type NodeType = "document" | "keyword" | "topic";
interface GraphNode { id: string; label: string; type: NodeType; meta: Record<string, string>; x?: number; y?: number; vx?: number; vy?: number; }
interface GraphLink { source: string | GraphNode; target: string | GraphNode; }

const NODE_COLORS: Record<NodeType, string> = { document: "#d97757", topic: "#2eb88a", keyword: "#5b9dd9" };

export default function GraphPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<"all" | NodeType>("all");
  const [loading, setLoading] = useState(true);
  const simRef = useRef<any>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    const kbId = localStorage.getItem("kb_id");
    if (!kbId) { setLoading(false); return; }

    api.graph.get(kbId).then(data => {
      setNodes(data.nodes as GraphNode[]);
      setLinks(data.links);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;
    import("d3").then(d3 => {
      const svg = d3.select(svgRef.current!);
      svg.selectAll("*").remove();

      const W = svgRef.current!.clientWidth;
      const H = svgRef.current!.clientHeight;

      const g = svg.append("g");

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", e => { g.attr("transform", e.transform.toString()); });
      svg.call(zoom);

      const filtered = filter === "all" ? nodes : nodes.filter(n => n.type === filter);
      const filteredIds = new Set(filtered.map(n => n.id));
      const filteredLinks = links.filter(l => {
        const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
        const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
        return filteredIds.has(s) && filteredIds.has(t);
      });

      const sim = d3.forceSimulation(filtered as any)
        .force("link", d3.forceLink(filteredLinks).id((d: any) => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force("collision", d3.forceCollide(30));
      simRef.current = sim;

      const link = g.append("g").selectAll("line")
        .data(filteredLinks).join("line")
        .style("stroke", "var(--border-strong)").attr("stroke-width", 1.5);

      const node = (g.append("g").selectAll("g")
        .data(filtered).join("g") as d3.Selection<SVGGElement, any, SVGGElement, unknown>)
        .style("cursor", "pointer")
        .on("click", (_e, d) => setSelected(d as GraphNode))
        .call(d3.drag<SVGGElement, any>()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

      node.append("circle")
        .attr("r", d => d.type === "document" ? 18 : 10)
        .attr("fill", d => NODE_COLORS[(d as GraphNode).type] + "33")
        .attr("stroke", d => NODE_COLORS[(d as GraphNode).type])
        .attr("stroke-width", 2);

      node.append("text")
        .attr("dy", d => d.type === "document" ? 32 : 22)
        .attr("text-anchor", "middle")
        .style("fill", "var(--text)")
        .attr("font-size", d => d.type === "document" ? 11 : 9)
        .text(d => (d as GraphNode).label.slice(0, 12));

      sim.on("tick", () => {
        link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    });
  }, [nodes, links, filter]);

  const filterBtns: Array<["all" | NodeType, string, string]> = [
    ["all", "全部", "var(--text)"], ["document", "文件", NODE_COLORS.document],
    ["topic", "主題", NODE_COLORS.topic], ["keyword", "關鍵詞", NODE_COLORS.keyword],
  ];

  return (
    <div style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)" }}>
        <button onClick={() => router.push("/chat")} className="btn-ghost" style={{ fontSize: 13, padding: "5px 10px" }}>← 返回對話</button>
        <Logo size={24} showText={false} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>知識圖譜</span>
        <div style={{ display: "flex", gap: 6, marginLeft: 16 }}>
          {filterBtns.map(([val, label, color]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${filter === val ? color : "var(--border)"}`, background: filter === val ? color + "22" : "transparent", color: filter === val ? color : "var(--muted)", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12, color: "var(--muted)", alignItems: "center" }}>
          {filterBtns.slice(1).map(([, label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />{label}
            </span>
          ))}
          <ThemeToggle />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SVG graph */}
        <div style={{ flex: 1, position: "relative" }}>
          {loading ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>載入中…</div>
          ) : nodes.length === 0 ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--muted)" }}>
              <div style={{ fontSize: 48 }}>🕸️</div>
              <p>知識庫尚無資料，請先至管理後台上傳文件。</p>
            </div>
          ) : (
            <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 280, borderLeft: "1px solid var(--border)", padding: 20, background: "var(--surface)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 15, wordBreak: "break-all" }}>{selected.label}</h3>
              <button onClick={() => setSelected(null)} className="del-btn">×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>類型</span>
                <span style={{ fontSize: 13, color: NODE_COLORS[selected.type] }}>{selected.type === "document" ? "文件" : selected.type === "topic" ? "主題" : "關鍵詞"}</span>
              </div>
              {Object.entries(selected.meta).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{k}</span>
                  <span style={{ fontSize: 13, wordBreak: "break-all", maxWidth: 160, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
