// components/Dashboard/RecoveryAndHealth.tsx
import React from "react";

// A generic “info card” with left text and right image for Recovery & Health
interface InfoCardProps {
  title: string;
  subtitle: string;
  bgImageUrl: string;
}

function InfoCard({ title, subtitle, bgImageUrl }: InfoCardProps) {
  return (
    <div className="p-4">
      <div className="flex items-stretch justify-between gap-4 rounded-xl">
        <div className="flex flex-col gap-1 flex-[2_2_0px]">
          <p className="text-white text-base font-bold leading-tight">
            {title}
          </p>
          <p className="text-[#a2b3b1] text-sm font-normal leading-normal">
            {subtitle}
          </p>
        </div>
        <div
          className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex-1"
          style={{ backgroundImage: `url("${bgImageUrl}")` }}
        />
      </div>
    </div>
  );
}

export default function RecoveryAndHealth() {
  return (
    <>
      <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Recovery &amp; Health
      </h2>

      {/* 1. Recovery Score (wide card at top) */}
      <div className="p-4 @container">
        <div className="flex flex-col items-stretch justify-start rounded-xl @xl:flex-row @xl:items-start">
          <div
            className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl"
            style={{
              backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDBSfHLLLKNShGvWXg211AqO7swZw1gPxK_Rzzu0dZefpTizYnPWCKmDuVqwtP67lTBCbONnlgRFU5o2pi92jd-ITPq5QtQmIQjxb7FIeLqh0hSlfbFwCnFszi_K_3DBVIbnMUmghCsUsxzTQ-2YXVmIjnlkXgMiL-t_mrpWJ3FJh1-YML04sFxQYfzdmDe_ZYJG3mvRZ8s6mTZgUrZIliMYefjnFZFctUWWKjf0BU9LHnImWcJe4Qtp8g7eDK4XxhA_9OOaQzO6thH")`,
            }}
          ></div>
          <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4 @xl:px-4">
            <p className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              Recovery Score
            </p>
            <div className="flex items-end gap-3 justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[#a2b3b1] text-base font-normal leading-normal">
                  85/100
                </p>
                <p className="text-[#a2b3b1] text-base font-normal leading-normal">
                  Ready for Training
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sleep Tracker */}
      <InfoCard
        title="Sleep Tracker"
        subtitle="Hours Slept: 7.5, Sleep Debt: 0.5, Sleep Quality: 80% (Light: 20%, Deep: 40%, REM: 20%)"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDW1I71ZCXZIAv1zG1PRwGfgldHyaWzjImxuPo_eZJMKQO6eOlgRFTkYggDp67ev1O7RNnUiznmBmJ5XlF6C5s-grl0vCHgCwyxW11syY4d-NhTI9xmFk4jGPXdFqL63cAWgxv_58mXI6xJS4Uj9diPI578gOiQ3Xed2BFWmDwEtZUpOZiTHSx0TFOMElnMi30-e4VwhDPyh4aRH5bvOUexhSgLEMRIHX6PqN2spWP6ZxbvWzUtDJT-gKU5mPBf9Y_3AhFyMFiGrV1z"
      />

      {/* 3. Heart Health */}
      <InfoCard
        title="Heart Health"
        subtitle="Resting HR: 55 bpm, HRV: 70 ms, Morning HR Spike: 5 bpm"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCFKP3a-1h6ilxDCAmoZ4YVRbUgAlZfIF2ynHDKpnwSk3idaNwo9UllWDK2GSTLptmkRy8-cBqTTEzSRAtHrgYBTztW7wKHJHObnLA16wZCUJOMEIphdTksj--v8jJeffZ4i1Xhi5McYWLbHA5jaIhp5Y2W2b4eE0V6YGnyEHF4amUTxRzjUcDflgAUDBH3RJggn3_S3H4xDl4Xd5LfryZ4mH8U-BoDCdnPSD32Jk4hMcGXUQzfol3fHUucLNXz4dZzs9dnwyimJhN3"
      />

      {/* 4. Fatigue Markers */}
      <InfoCard
        title="Fatigue Markers"
        subtitle="Muscle Soreness: Low, CNS Stress: Moderate"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAvz0ETPZRn57Tur5D47EH1km1q2waNMPsvZawN50JZ4xawWNUL5AaACW0CKEkmAv2H978OQVsuPgN-h2By-eYJ0eldCBSGFbAvHLe3C1C8u_VRLL-blFiTz0H3qVnHifr_b7MQ7ivt2vJ0HlXrKZgPhmR7qWL15UtZp6VWP0Kpn2GRnIP67hQevbVGenOC-hSnSC37RJN23F4P-xEN3f_9rgoshvNZFO2YdM-Mrm8SCELFFiDEHhXDP3iIUtkHFr1FDDsdGoy49N73"
      />

      {/* 5. Wellness Journal Highlights */}
      <InfoCard
        title="Wellness Journal Highlights"
        subtitle="Mood: Stable, Energy Levels: High"
        bgImageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDK-M5LXj4G9rzodmsmvG_aAnxtvgAMqCBeOBwRwRt8SjQ7ASmzZxepVwo8-ntVAqqEUQqXJaRkApOtchbs4xzByJaBhEm5pzRPcr_AZHuURoL9R4MA39OW4HRW3o8L7UbjtDrzXRzkgaxoPe-JK2xgDan6aqsFuXdbFFfwOF_82qw-Aq7kja-Z06X3UFBsitbmPzJ8VKQjOxYCLZ4yW6w43jo2vNdVy69JX0X0qQZNBTo30EiUVDBkUaTDOw3o7zER4BZbU-XR-qxl"
      />
    </>
  );
}
