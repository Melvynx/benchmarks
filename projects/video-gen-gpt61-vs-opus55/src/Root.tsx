import { Composition } from "remotion"
import { Comparison, TOTAL_FRAMES } from "./Comparison"

export const Root = () => (
  <Composition
    id="Comparison"
    component={Comparison}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
)
