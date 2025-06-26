import type { Icon } from "@/types";
import { blue, grey } from "@mui/material/colors";

export const paintLandMarkSVG = (icon: Icon) => {
  const { width, height, fill } = icon;
  const svg = `
    <svg width="${width}px" height="${height}px" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <title>location-filled</title>
      <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="location-outline" fill="${fill}" transform="translate(106.666667, 42.666667)">
          <path d="M149.333333,7.10542736e-15 C231.807856,7.10542736e-15 298.666667,66.8588107 298.666667,149.333333 C298.666667,176.537017 291.413333,202.026667 278.683512,224.008666 C270.196964,238.663333 227.080238,313.32711 149.333333,448 C71.5864284,313.32711 28.4697022,238.663333 19.9831547,224.008666 C7.25333333,202.026667 2.84217094e-14,176.537017 2.84217094e-14,149.333333 C2.84217094e-14,66.8588107 66.8588107,7.10542736e-15 149.333333,7.10542736e-15 Z M149.333333,85.3333333 C113.987109,85.3333333 85.3333333,113.987109 85.3333333,149.333333 C85.3333333,184.679557 113.987109,213.333333 149.333333,213.333333 C184.679557,213.333333 213.333333,184.679557 213.333333,149.333333 C213.333333,113.987109 184.679557,85.3333333 149.333333,85.3333333 Z" id="Combined-Shape" />
        </g>
      </g>
    </svg>
  `;
  const cleanedSvg = svg.trim().replace(/\s\s+/g, " ");
  return `data:image/svg+xml;base64,${btoa(cleanedSvg)}`;
};

type PaintPathToIcon = Partial<Icon> & { content: string; viewBox?: string };
// 獲取 Path，並轉換為 Data URI
export const paintPathToIcon = (icon: PaintPathToIcon) => {
  const {
    width = 32,
    height = 32,
    fill = "black",
    content,
    viewBox = "0 0 24 24",
  } = icon;
  const viewBoxParts = viewBox.split(" ").map(Number);
  const [, , vbWidth, vbHeight] = viewBoxParts;

  const circleCx = vbWidth / 2;
  const circleCy = vbHeight / 2;
  const circleR = Math.min(vbWidth, vbHeight) / 2;

  const scale = 0.8;
  const translateX = (vbWidth * (1 - scale)) / 2;
  const translateY = (vbHeight * (1 - scale)) / 2;
  const svg = `
    <svg width="${width}px" height="${height}px" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${circleCx}" cy="${circleCy}" r="${circleR}" fill="${blue[400]}"/>
      <g transform="translate(${translateX}, ${translateY}) scale(${scale})" color="${fill}" fill="${fill}">
        ${content}
      </g>
    </svg>
  `;
  const cleanedSvg = svg.trim().replace(/\s\s+/g, " ");
  return `data:image/svg+xml;base64,${btoa(cleanedSvg)}`;
};

export const paintPathToConstructionWorker = (icon: Partial<Icon>) => {
  const { width = 32, height = 32, fill = "black" } = icon;
  const viewBox = "0 0 256 256";
  const viewBoxParts = viewBox.split(" ").map(Number);
  const [, , vbWidth, vbHeight] = viewBoxParts;

  const circleCx = vbWidth / 2;
  const circleCy = vbHeight / 2;
  const circleR = Math.min(vbWidth, vbHeight) / 2;

  const scale = 0.8;
  const translateX = (vbWidth * (1 - scale)) / 2;
  const translateY = (vbHeight * (1 - scale)) / 2;
  const content = `
<circle cx="114.5" cy="42.7" r="21.7" />
<path d="M34.9,152.5l-0.2-0.2l0,0c-0.9-0.6-1.7-1.1-2.4-1.9l2.4,27.5L4.5,220.7c-4.3,6.2-2.8,14.6,3.2,18.9 c6.2,4.3,14.6,2.8,18.9-3.2l32.6-47c1.7-2.4,2.8-5.6,2.4-8.8l-1.1-13.3L34.9,152.5z" />
<path d="M124.6,242h129.4l-24.2-75.5c0,0-13.7,3.4-40.8,32.2c-0.6,0.6-1.3,1.3-1.9,1.9l-65.4-37.8 c1.1-2.1,1.3-4.5,0.9-7.1l-23.2-86c-1.9-8.4-9.4-14.8-18.2-14.8H37.9c-3.2,0-6.4,1.7-8.2,4.5L8.1,96.9c-2.8,4.5-1.1,10.3,3.4,12.9 l24.2,13.9l-3.2,5.4c-3.9,6.4-1.7,14.6,4.9,18.2l54.3,31.3v49.6c0,7.5,6,13.5,13.5,13.5s13.5-6,13.5-13.5v-56.6l60.1,34.8 c-12.4,7.1-26.6,8.4-36.7,14.4C129.7,228.2,124.6,242,124.6,242z M40.3,115.8l-15.9-9.2l0,0L43.3,74h21.2L40.3,115.8z M75.2,136 l15-26.2l11.2,41.2L75.2,136z" />
`;

  const svg = `
    <svg width="${width}px" height="${height}px" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" >
      <circle cx="${circleCx}" cy="${circleCy}" r="${circleR}" fill="${blue[400]}"/>
      <g transform="translate(${translateX}, ${translateY}) scale(${scale})" fill="${fill}">
        ${content}
      </g>
    </svg>
  `;
  const cleanedSvg = svg.trim().replace(/\s\s+/g, " ");
  return `data:image/svg+xml;base64,${btoa(cleanedSvg)}`;
};
