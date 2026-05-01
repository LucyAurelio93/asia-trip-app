import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asia Trip",
    short_name: "Asia Trip",
    description: "Itinerario de viaje por Corea, Japón y Tailandia",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF7F0",
    theme_color: "#FFF7F0",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}