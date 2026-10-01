import { createFileRoute } from "@tanstack/react-router";
import { Gravewake } from "@/game/Gravewake";

export const Route = createFileRoute("/")({ component: Gravewake });
