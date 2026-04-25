import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface Point {
  I: number;
  t: number;
}

interface CurveData {
  label: string;
  points: Point[];
  color: string;
}

export interface SpecialPoint {
  I: number;
  t: number;
  label: string;
  type: 'ANSI' | 'INRUSH' | 'NOMINAL' | 'ICC' | 'GERACAO' | 'SINCRONISMO' | 'INST' | 'DEF';
}

interface CoordChartProps {
  curves: CurveData[];
  icc_3f: number;
  icc_1f?: number;
  Inominal?: number;
  specialPoints?: SpecialPoint[];
  showLegend?: boolean;
}

export const CoordChart: React.FC<CoordChartProps> = ({ curves, icc_3f, icc_1f, Inominal, specialPoints = [], showLegend = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const [isZooming, setIsZooming] = useState(false);

  const exportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "coordenograma.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const exportPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = 1600; 
    canvas.height = 1200;
    
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "black"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "coordenograma.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const zoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 40, right: 60, bottom: 80, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Clipping path para que as curvas não fujam do gráfico ao dar zoom
    svg.append("defs").append("clipPath")
      .attr("id", "chart-area")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    const mainGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Escalas Logarítmicas Base
    const xScaleBase = d3.scaleLog()
      .domain([1, 100000])
      .range([0, width]);

    const yScaleBase = d3.scaleLog()
      .domain([0.01, 1000])
      .range([height, 0]);

    // Grupos de elementos
    const gridGroup = mainGroup.append("g").attr("class", "grids");
    const curvesGroup = mainGroup.append("g").attr("class", "curves").attr("clip-path", "url(#chart-area)");
    const iccGroup = mainGroup.append("g").attr("class", "icc-lines").attr("clip-path", "url(#chart-area)");
    const pointsGroup = mainGroup.append("g").attr("class", "special-points").attr("clip-path", "url(#chart-area)");
    const labelsGroup = mainGroup.append("g").attr("class", "dynamic-labels");
    const axisXGroup = mainGroup.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    const axisYGroup = mainGroup.append("g").attr("class", "y-axis");

    // Eixos e Ticks
    const xTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const yTicks = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

    const xAxis = d3.axisBottom(xScaleBase)
      .tickValues(xTicks)
      .tickFormat((d) => {
        const v = d.valueOf();
        if (v >= 1000) return `${v / 1000}k`;
        return `${v}`;
      })
      .tickSize(-height);

    const yAxis = d3.axisLeft(yScaleBase)
      .tickValues(yTicks)
      .tickFormat((d) => d.valueOf().toString())
      .tickSize(-width);

    // Tooltip elements (mantidos fora do zoom individual para serem atualizados dinamicamente)
    const tooltipGroup = mainGroup.append("g")
      .attr("class", "tooltip")
      .style("display", "none")
      .style("pointer-events", "none");

    const tooltipLineX = tooltipGroup.append("line")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("y1", 0)
      .attr("y2", height);

    const tooltipLineY = tooltipGroup.append("line")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("x1", 0)
      .attr("x2", width);

    const tooltipCircle = tooltipGroup.append("circle")
      .attr("r", 4)
      .attr("fill", "#22c55e")
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    const tooltipBg = tooltipGroup.append("rect")
      .attr("width", 120)
      .attr("height", 50)
      .attr("fill", "rgba(0,0,0,0.85)")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    const tooltipText = tooltipGroup.append("text")
      .attr("fill", "#22c55e")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("x", 8)
      .attr("y", 18);

    const bisectCurrent = d3.bisector((d: Point) => d.I).left;
    let currentXScale = xScaleBase;
    let currentYScale = yScaleBase;

    // Função Principal de Renderização / Update
    const render = (newXScale: any, newYScale: any) => {
      currentXScale = newXScale;
      currentYScale = newYScale;

      // Ensure crisp rendering for engineering accuracy
      mainGroup.attr("shape-rendering", "geometricPrecision");

      // Update Eixos
      axisXGroup.call(xAxis.scale(newXScale))
        .attr("color", "rgba(34, 197, 94, 0.4)")
        .selectAll("line")
        .attr("stroke", (d: any) => {
          const l10 = Math.log10(d);
          return Math.abs(l10 - Math.round(l10)) < 1e-10 ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.05)";
        });
      
      axisYGroup.call(yAxis.scale(newYScale))
        .attr("color", "rgba(34, 197, 94, 0.4)")
        .selectAll("line")
        .attr("stroke", (d: any) => {
          const l10 = Math.log10(d);
          return Math.abs(l10 - Math.round(l10)) < 1e-10 ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.05)";
        });

      axisXGroup.selectAll("text").attr("fill", "rgba(34, 197, 94, 0.6)").attr("font-weight", "bold");
      axisYGroup.selectAll("text").attr("fill", "rgba(34, 197, 94, 0.6)").attr("font-weight", "bold");

      // Update Pickups Labels
      labelsGroup.selectAll("*").remove();
      const pickupPositions: number[] = [];
      curves.forEach((curve, idx) => {
        if (curve.points.length > 0) {
          const pickup = curve.points[0].I / 1.1;
          const px = newXScale(pickup);
          if (px >= 0 && px <= width) {
            let py = height + 15;
            // Evitar sobreposição de etiquetas de pickup na base
            pickupPositions.forEach(pos => {
              if (Math.abs(pos - px) < 40) py += 12;
            });
            pickupPositions.push(px);

            const labelText = pickup.toFixed(0);
            const labelW = labelText.length * 6 + 4;

            labelsGroup.append("rect")
              .attr("x", px - labelW/2)
              .attr("y", py - 9)
              .attr("width", labelW)
              .attr("height", 12)
              .attr("fill", "black")
              .attr("opacity", 1)
              .attr("rx", 2)
              .attr("class", "label-bg");

            labelsGroup.append("text")
              .attr("x", px)
              .attr("y", py)
              .attr("fill", curve.color)
              .attr("font-size", "9px")
              .attr("font-family", "monospace")
              .attr("text-anchor", "middle")
              .attr("font-weight", "bold")
              .text(labelText);
              
            labelsGroup.append("line")
              .attr("x1", px)
              .attr("x2", px)
              .attr("y1", height)
              .attr("y2", py - 9)
              .attr("stroke", curve.color)
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "2,1");
          }
        }
      });

      // Update Curvas
      const lineGenerator = d3.line<Point>()
        .x(d => newXScale(d.I))
        .y(d => newYScale(d.t))
        .curve(d3.curveMonotoneX);

      curvesGroup.selectAll("path").remove();
      curves.forEach(curve => {
        curvesGroup.append("path")
          .datum(curve.points)
          .attr("class", "curve-path")
          .attr("fill", "none")
          .attr("stroke", curve.color)
          .attr("stroke-width", 2)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("d", lineGenerator);
      });

      // Update ICC Lines
      iccGroup.selectAll("*").remove();
      const drawIcc = (val: number, label: string, color: string, yPos: number = 15) => {
        if (!val) return;
        const ix = newXScale(val);
        if (ix < 0 || ix > width) return;

        iccGroup.append("line")
          .attr("x1", ix)
          .attr("x2", ix)
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,2");

        const textGroup = iccGroup.append("g");
        const textStr = `${label}: ${val}A`;
        const textW = textStr.length * 7 + 16;
        
        textGroup.append("rect")
          .attr("x", ix - 35)
          .attr("y", yPos - 10)
          .attr("width", 70)
          .attr("height", 14)
          .attr("fill", "black")
          .attr("opacity", 1) // Full opacity to cover grid lines
          .attr("rx", 2)
          .attr("class", "label-bg");

        textGroup.append("text")
          .attr("x", ix)
          .attr("y", yPos)
          .attr("fill", color)
          .attr("font-size", "11px")
          .attr("font-family", "monospace")
          .attr("text-anchor", "middle")
          .attr("font-weight", "bold")
          .text(textStr);
      };

      const icc3x = newXScale(icc_3f);
      const icc1x = icc_1f ? newXScale(icc_1f) : null;
      let icc1y = 15;
      if (icc1x !== null && Math.abs(icc3x - icc1x) < 80) {
        icc1y = 30; // Deslocar se estiver perto
      }

      drawIcc(icc_3f, "Icc 3f", "#ef4444", 15);
      if (icc_1f) drawIcc(icc_1f, "Icc 1f", "#3b82f6", icc1y);

      // Update Special Points
      pointsGroup.selectAll("*").remove();
      const pointLabels: {x: number, y: number, w: number, h: number}[] = [];

      specialPoints.forEach(p => {
        const px = newXScale(p.I);
        const py = newYScale(p.t);
        if (px < 0 || px > width || py < 0 || py > height) return;

        if (p.type === 'ANSI') {
          pointsGroup.append("rect").attr("x", px-4).attr("y", py-4).attr("width", 8).attr("height", 8).attr("fill", "#f59e0b").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'INRUSH') {
          pointsGroup.append("circle").attr("cx", px).attr("cy", py).attr("r", 4).attr("fill", "#ec4899").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'NOMINAL') {
          pointsGroup.append("path").attr("d", d3.symbol().type(d3.symbolDiamond).size(60)()).attr("transform", `translate(${px}, ${py})`).attr("fill", "#8b5cf6").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'GERACAO') {
          pointsGroup.append("path").attr("d", d3.symbol().type(d3.symbolTriangle).size(80)()).attr("transform", `translate(${px}, ${py})`).attr("fill", "#a855f7").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'SINCRONISMO') {
          pointsGroup.append("path").attr("d", d3.symbol().type(d3.symbolWye).size(80)()).attr("transform", `translate(${px}, ${py})`).attr("fill", "#06b6d4").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'INST') {
          pointsGroup.append("circle").attr("cx", px).attr("cy", py).attr("r", 4).attr("fill", "#e11d48").attr("stroke", "white").attr("stroke-width", 1);
        } else if (p.type === 'DEF') {
          pointsGroup.append("circle").attr("cx", px).attr("cy", py).attr("r", 4).attr("fill", "#f97316").attr("stroke", "white").attr("stroke-width", 1);
        }

        // Evitar sobreposição de rótulos de pontos especiais e garantir que não sejam clipados
        let lx = px + (p.label.toLowerCase().includes('carga') ? 30 : 12);
        let ly = py + 4;
        const curW = p.label.length * 7 + 10; // Extra padding for wider labels like "Carga"
        const curH = 16;
        
        // Ajuste inteligente para evitar que o rótulo saia do gráfico à direita
        // Se for Carga, permitimos que ele fique mais próximo da borda direita antes de inverter
        const rightEdgeLimit = p.label.toLowerCase().includes('carga') ? 5 : 10;
        if (lx + curW > width - rightEdgeLimit) {
          lx = px - curW - 14;
        }

        let attempts = 0;
        while (attempts < 20) {
          const overlap = pointLabels.some(label => {
            const hOverlap = lx < label.x + label.w + 4 && lx + curW > label.x - 4;
            const vOverlap = ly < label.y + label.h + 4 && ly + curH > label.y - 4;
            return hOverlap && vOverlap;
          });
          
          if (overlap) {
            ly += 15;
            if (ly > height - 15) {
              ly = 40; 
              lx -= 20;
            }
            attempts++;
          } else {
            break;
          }
        }
        
        // Garantia final de bordas internas
        if (ly < 20) ly = 25;
        if (ly > height - curH - 10) ly = height - curH - 15;
        if (lx < 10) lx = 15;
        if (lx + curW > width - 5) lx = width - curW - 10;

        pointLabels.push({x: lx, y: ly, w: curW, h: curH});

        // Usamos labelsGroup (não clipado) para os rótulos de texto
        const labelG = labelsGroup.append("g");
        
        labelG.append("rect")
          .attr("x", lx - 3)
          .attr("y", ly - 11)
          .attr("width", curW)
          .attr("height", curH)
          .attr("fill", "black")
          .attr("stroke", "white")
          .attr("stroke-width", "0.5px")
          .attr("opacity", 1)
          .attr("rx", 3)
          .attr("class", "label-bg");

        const labelText = labelG.append("text")
          .attr("x", lx + curW/2 - 3)
          .attr("y", ly)
          .attr("fill", "white")
          .attr("font-size", "10px") // Slightly smaller font for better fit
          .attr("font-family", "monospace")
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .text(p.label);
      });
    };

    // Zoom Behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => {
        const newXScale = event.transform.rescaleX(xScaleBase);
        const newYScale = event.transform.rescaleY(yScaleBase);
        render(newXScale, newYScale);
      })
      .on("start", () => setIsZooming(true))
      .on("end", () => setIsZooming(false));

    zoomRef.current = zoom;
    svg.call(zoom as any);

    // Initial render
    render(xScaleBase, yScaleBase);

    // Mouse Events for Tooltip (usando currentXScale e currentYScale)
    const interceptor = svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .on("mousemove", (event) => {
        const [mX] = d3.pointer(event);
        const mouseX = mX;
        const currentI = currentXScale.invert(mouseX);

        let nearestCurve = null;
        let minDiff = Infinity;
        let nearestPoint = null;

        curves.forEach(curve => {
          const i = bisectCurrent(curve.points, currentI);
          const d0 = curve.points[i - 1];
          const d1 = curve.points[i];
          if (!d0 && !d1) return;
          const d = (d0 && d1) ? (currentI - d0.I > d1.I - currentI ? d1 : d0) : (d0 || d1);
          const diff = Math.abs(currentXScale(d.I) - mouseX);
          if (diff < minDiff) { minDiff = diff; nearestCurve = curve; nearestPoint = d; }
        });

        if (nearestPoint && minDiff < 50) {
          tooltipGroup.style("display", null);
          const tx = currentXScale(nearestPoint.I);
          const ty = currentYScale(nearestPoint.t);
          tooltipLineX.attr("x1", tx).attr("x2", tx).attr("y1", ty).attr("y2", height);
          tooltipLineY.attr("x1", 0).attr("x2", tx).attr("y1", ty).attr("y2", ty);
          tooltipCircle.attr("cx", tx).attr("cy", ty).attr("fill", nearestCurve!.color);
          const boxX = tx + 140 > width ? tx - 130 : tx + 10;
          const boxY = ty + 60 > height ? ty - 60 : ty + 10;
          tooltipBg.attr("x", boxX).attr("y", boxY);
          tooltipText.attr("x", boxX + 8).attr("y", boxY + 18);
          tooltipText.selectAll("*").remove();
          tooltipText.append("tspan").attr("x", boxX + 8).attr("dy", "0").text(`CURVA: ${nearestCurve!.label}`);
          tooltipText.append("tspan").attr("x", boxX + 8).attr("dy", "1.2em").text(`CORR: ${nearestPoint.I.toFixed(2)}A`);
          tooltipText.append("tspan").attr("x", boxX + 8).attr("dy", "1.2em").text(`TEMPO: ${nearestPoint.t.toFixed(3)}s`);
        } else {
          tooltipGroup.style("display", "none");
        }
      })
      .on("mouseout", () => tooltipGroup.style("display", "none"));

    // Static Axis Labels
    svg.append("text")
      .attr("transform", `translate(${margin.left + width/2}, ${margin.top + height + 55})`)
      .style("text-anchor", "middle")
      .attr("fill", "#22c55e")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .text("CORRENTE (A)");

    svg.append("text")
      .attr("transform", `translate(${margin.left - 55}, ${margin.top + height/2}) rotate(-90)`)
      .style("text-anchor", "middle")
      .attr("fill", "#22c55e")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .text("TEMPO (s)");

  }, [curves, icc_3f, icc_1f, Inominal, specialPoints]);

  return (
    <div className="bg-black border border-[#22c55e33] rounded shadow-inner p-2 overflow-hidden relative group coord-chart-container print:bg-white print:border-black print:p-0">
      {/* Botões de Controle do Gráfico */}
      <div className="absolute top-4 left-4 flex gap-1 z-10 opacity-60 hover:opacity-100 transition-opacity no-print" style={{ pointerEvents: 'auto' }}>
        <button onClick={zoomIn} title="Zoom In" className="p-1.5 bg-[#18181b] border border-[#27272a] text-[#22c55e] rounded hover:bg-[#22c55e] hover:text-black transition-all no-print">
          <ZoomIn className="w-4 h-4 no-print" />
        </button>
        <button onClick={zoomOut} title="Zoom Out" className="p-1.5 bg-[#18181b] border border-[#27272a] text-[#22c55e] rounded hover:bg-[#22c55e] hover:text-black transition-all no-print">
          <ZoomOut className="w-4 h-4 no-print" />
        </button>
        <button onClick={resetZoom} title="Reset Zoom" className="p-1.5 bg-[#18181b] border border-[#27272a] text-[#22c55e] rounded hover:bg-[#22c55e] hover:text-black transition-all no-print">
          <Maximize2 className="w-4 h-4 no-print" />
        </button>
        <div className="mx-2 flex items-center gap-1 text-[10px] text-[#71717a] font-mono hidden sm:flex no-print">
          <Move className="w-3 h-3 no-print" /> ARRASTE PARA NAVEGAR
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 no-print">
        <button onClick={exportPNG} title="Baixar Gráfico (Figura)" className="p-2 bg-[#18181bcc] hover:bg-[#16a34a] border border-[#27272a] text-[#a1a1aa] hover:text-black rounded transition-all no-print">
          <ImageIcon className="w-4 h-4 no-print" />
        </button>
      </div>

      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%"
        className={`flex-1 min-h-[300px] sm:min-h-[600px] cursor-crosshair print:min-h-0 print:h-auto ${isZooming ? 'cursor-grabbing' : 'cursor-crosshair'}`} 
        viewBox="0 0 800 600" 
        preserveAspectRatio="xMidYMid meet" 
      />

      {/* Legenda do Gráfico (Modo Real-time / App) */}
      {!showLegend && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 bg-[#09090b] border-t border-[#16a34a33] print:hidden no-print">
          {curves.map((curve, idx) => (
            <div key={idx} className="flex items-center gap-2">
               <div className="w-3 h-0.5" style={{ backgroundColor: curve.color }}></div>
               <span className="text-[9px] text-[#a1a1aa] font-bold uppercase truncate">{curve.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
             <div className="w-3 h-0.5 border-t border-dashed border-[#ef4444]"></div>
             <span className="text-[9px] text-[#a1a1aa] font-bold uppercase truncate">Icc 3phi ({icc_3f}A)</span>
          </div>
          {icc_1f && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 border-t border-dashed border-[#3b82f6]"></div>
              <span className="text-[9px] text-[#a1a1aa] font-bold uppercase truncate">Icc 1phi ({icc_1f}A)</span>
            </div>
          )}
        </div>
      )}

      {/* Legenda Exclusiva para Relatório e Impressão (ShowLegend=true) */}
      {(showLegend || true) && (
        <div className={`${showLegend ? 'grid' : 'hidden print:grid'} grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border-t border-black w-full`}>
          {curves.map((curve, idx) => (
            <div key={idx} className="flex items-center gap-2">
               <div className="w-5 h-1.5" style={{ backgroundColor: curve.color }}></div>
               <span className="text-[10px] text-black font-black uppercase break-words leading-tight">{curve.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
             <div className="w-5 h-0.5 border-t-2 border-dashed border-[#ef4444]"></div>
             <span className="text-[10px] text-black font-black uppercase">Icc 3phi ({icc_3f}A)</span>
          </div>
          {icc_1f && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 border-t-2 border-dashed border-[#3b82f6]"></div>
              <span className="text-[10px] text-black font-black uppercase">Icc 1phi ({icc_1f}A)</span>
            </div>
          )}
          {specialPoints.some(p => p.type === 'ANSI') && (
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-[#f59e0b] border border-black"></div>
               <span className="text-[10px] text-black font-black uppercase">Ponto ANSI</span>
             </div>
          )}
          {specialPoints.some(p => p.type === 'INRUSH') && (
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-[#ec4899] border border-black"></div>
               <span className="text-[10px] text-black font-black uppercase">Inrush</span>
             </div>
          )}
        </div>
      )}
      
      {/* Indicador de Zoom Ativo */}
      {isZooming && (
        <div className="absolute bottom-4 right-4 px-2 py-1 bg-[#22c55e] text-black text-[10px] font-bold rounded animate-pulse">
          NAVEGANDO...
        </div>
      )}
    </div>
  );
};