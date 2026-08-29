export const dynamic = "force-static";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="32" fill="#c8ff3d"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="#0d1613" stroke-width="2"/>
  <path d="M40.7 23.4C38.4 20.6 35.5 19.2 32 19.2C24.5 19.2 19.5 24.7 19.5 32S24.5 44.8 32 44.8c3.5 0 6.5-1.4 8.8-4.3M30.6 32h13.9" fill="none" stroke="#0d1613" stroke-width="5"/>
</svg>`;

export function GET(): Response {
  return new Response(ICON, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
