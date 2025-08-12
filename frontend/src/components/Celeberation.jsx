import { Player } from "@lottiefiles/react-lottie-player";

export default function Celebration() {
  return (
    <div>
      <h1>Level Completed! 🎉</h1>
      <Player
        autoplay
        loop
        src="https://assets4.lottiefiles.com/packages/lf20_zrqthn6o.json"
        style={{ height: "300px", width: "300px" }}
      />
    </div>
  );
}
