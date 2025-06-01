// components/Dashboard/TodaysHighlights.tsx
import React from "react";

interface HighlightCardProps {
  title: string;
  subtitle: string;
  bgImageUrl: string;
}

function HighlightCard({ title, subtitle, bgImageUrl }: HighlightCardProps) {
  return (
    <div className="p-4">
      <div className="flex items-stretch justify-between gap-4 rounded-xl">
        {/* Left: text */}
        <div className="flex flex-col gap-1 flex-[2_2_0px]">
          <p className="text-white text-base font-bold leading-tight">
            {title}
          </p>
          <p className="text-[#a2b3b1] text-sm font-normal leading-normal">
            {subtitle}
          </p>
        </div>
        {/* Right: background image */}
        <div
          className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex-1"
          style={{ backgroundImage: `url("${bgImageUrl}")` }}
        />
      </div>
    </div>
  );
}

export default function TodaysHighlights() {
  return (
    <>
      <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Today&apos;s Highlights
      </h2>

      {/* Cycling */}
      <HighlightCard
        title="Cycling"
        subtitle="Distance: 45 km, Elevation Gain: 800 m, Training Load (TSS): 150"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBzK63sMA_psEqDU_yzBZqGstJd7G1gf4DkuOkvUuSOPiiyhxBOnsddAwlB3g1DAsf6QiCXFjJJG897-4k4unILd9EtuPcQqjasGFtDbnPQwNVZy_YXHs74iti2lNynteMeKNcHR586QDLNX2hyCz6Ec4e4RyVXgYdqM8GB8aFfGvHgsWkmGL1DqoiOZS9dHh1TLNFuEKl0yl8qbbqsqEkkX8n82wh5Zexbx6IL76TRJmne-pUcWPXG8SGD7DRGEGGoRDtKeZbzyEef"
      />

      {/* Weightlifting */}
      <HighlightCard
        title="Weightlifting"
        subtitle="Volume: 2500 lbs, Max Effort: 90%, Muscle Group: Legs"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBf1sW38T09gncUULnPkQJHNrSyaTMvEnT3gDXVKHhxvjvyjUtX4SdDxHa-rVixlctxPvyynXAkjGyFru6ndYtDSmXTFGBY558c4YOP6P4CAOjPXY1EYzLKASPwcA_1WsutuSGK9GzloxFVgDBSJxI9gxXFxSSXe1Ez8hUi_ti5YhGNhvb7lqFln6yXkfScv9bDzKE_DF7enLyiJcUgxYzTRMlcK3WLC_7W1BEmgDqwmkTeSisQiCq6-8rnU-6Ia6FPSTpdb8RssAtC"
      />

      {/* Calisthenics */}
      <HighlightCard
        title="Calisthenics"
        subtitle="Reps: 120, Progression: Advanced Push-Up, Muscle Activation: Chest, Shoulders, Triceps"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCMbPvpju0gllB4QawCF6iXSTAyvFtw_kz0EiSrVI2AuoQlQLWOVtnMhF-Suvd3tqVFSA0Zk0iE5Y6OnUczdTghGbEyQbVYBXY5wq1u7pkz6-CbQIhkx3B7sf5arVfD1KVgHMY85dFbzTvAcFXkFciSxtD3cfZioSx_Kw-ppdVKeVlGDA7dnYVHR3eIcqRqarTAMEuBD-04b_RSGgWx2dInpIz5CPvWMXZfiPkTmv0hA1h931YQJLILn54pIZnVrsKIuq7bgvJVgJ0C"
      />

      {/* Climbing */}
      <HighlightCard
        title="Climbing"
        subtitle="Route Grade: 5.11b, Session Time: 2 hours, Grip Load: High"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBWHpIjny9XO_RUIF17y2UkZwzrBPC7AAZH1XiUvHINCTSrCl6RS6JhYRIVMc2xbTBebOYhnJJtoQ09ZINJ0d9qvfKdEz9p5B-5jBNUGu6NDXo6TZj_tZmQ1Llc9LAb0Fj1_xUFelV-38t92Uy_zkGqoZw1QysfezQE1veicjiztVxA5082MdA5gWfiHHsxKlF9V5SMWdj54MZ3KFk2RkGmnbLY9_dqGowxd74wWBdF5aNMkFL-vrhc5SGvqF96cC6uChXozGLsgAz4"
      />

      {/* Paddling */}
      <HighlightCard
        title="Paddling"
        subtitle="Distance: 15 km, Stroke Efficiency: 85%, Heart Rate Zone: 2-3"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBd-MTRYyB_HAOsxt5d1uac52kGVdWIGwmgBu397Wxo4pAoUl06ugdAwDWeruTh0L9kPZXuVF75yrxqOM9xfVZOTzlMuXBnj8JhvP1leuHsrKYd3MSK8Gou2fn5C9OmtIYtXPj2otfixNr2u9r0VkAg1WXBVBWR3ZHoDxBJPyc5Vd0xYbG3eZ0rKhXUnzXuJuTatx2-5iwNENG0g5kMyY0_P3ef8rklfX8ixae0Dh-r5kUYDbJZkW5xQ-nEjA5IdvJD7wneM5VTmX5S"
      />
    </>
  );
}
