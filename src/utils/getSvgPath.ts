import ReactDOMServer from "react-dom/server";
import type { ReactElement } from "react";

export function getSvgData(icon: ReactElement): {
  content: string;
  viewBox: string;
} {
  const iconString = ReactDOMServer.renderToString(icon);
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(iconString, "image/svg+xml");
  const svgNode = svgDoc.querySelector("svg");

  if (!svgNode) {
    return { content: "", viewBox: "0 0 24 24" };
  }
  const content = svgNode.innerHTML;
  const viewBox = svgNode.getAttribute("viewBox") || "0 0 24 24";
  return { content, viewBox };
}
