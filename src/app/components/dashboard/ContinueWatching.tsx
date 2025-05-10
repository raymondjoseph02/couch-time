import { VideoCard } from "./VideoCard";

export const ContinueWatching = () => {
  return (
    <section className="flex flex-col gap-5">
      <p className="h3 text-white/70">Continue for Ekene Smart </p>
      <div className="grid grid-cols-4  gap-5">
        <VideoCard />
        <VideoCard />
        <VideoCard />
        <VideoCard />
      </div>
    </section>
  );
};
