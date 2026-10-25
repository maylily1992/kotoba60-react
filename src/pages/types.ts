import type { Scene } from "../types";
import type { WeakBookRepository } from "../lib/weakBook";

export type RouteName =
  | "home"
  | "wakeup"
  | "recall"
  | "dialogue"
  | "feedback"
  | "repeat"
  | "summary"
  | "review"
  | "notebook";

export interface PageProps {
  scene: Scene;
  studyDay: number;
  repo: WeakBookRepository;
  navigate: (route: RouteName) => void;
  refresh: () => void;
}
