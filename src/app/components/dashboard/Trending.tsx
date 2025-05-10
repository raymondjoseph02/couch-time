import { VideoCard } from "./VideoCard";

export const Trending = () => {
  return (
    <section className="flex flex-col gap-5">
      <p className="h3 text-white/70">Trending Now </p>
      <div className="grid grid-cols-3  gap-5">
        <VideoCard />
        <VideoCard />
        <VideoCard />
      </div>
    </section>
  );
};
