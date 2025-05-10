import dummy_vidoe_image from "@/assets/image/Movie-card.webp";
export const SportLight = () => {
  return (
    <div className="space-y-5 ">
      <p className="text-[#FFFFFFB2] h3">Movie Spotlight</p>
      <div
        style={{
          backgroundImage: `url(${dummy_vidoe_image.src})`,
        }}
        className="min-h-[28rem] sm:min-h-[33.75rem] w-full rounded-xl bg-cover bg-center bg-no-repeat flex items-end"
      >
        <div className="px-2 xs:px-4 sm:px-10 py-8 space-y-2.5">
          <h2 className="line-clamp-1">
            Discover new worlds with Interstellar
          </h2>
          <p className="sm:text-xl text-base xs:font-medium text-white leading-[150%] tracking-[1%]  ">
            A farmer and a team of explorers journey across space to save
            humanity.
          </p>
          <div className="flex items-center gap-4 ">
            <p className="text-lg font-normal text-white opacity-75">2025</p>
            <p className="text-lg font-normal text-white opacity-75">Fiction</p>
            <p className="text-lg font-normal text-white opacity-75">
              1hr 37 min
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
