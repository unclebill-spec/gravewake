import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gravewake } from "@/game/Gravewake";
import { installMenuTheme } from "@/menus/menutheme"; // menus-restyle (2026-10-23): gothic menu chrome, UI blips, close tween

function GravewakePage() {
  useEffect(() => installMenuTheme(), []);
  return <Gravewake />;
}

export const Route = createFileRoute("/")({ component: GravewakePage });
