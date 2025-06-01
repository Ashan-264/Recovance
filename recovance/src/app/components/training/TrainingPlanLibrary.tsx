// components/TrainingPlanLibrary.tsx
import React from "react";
import TrainingPlanCard from "./TrainingPlanCard";

const plans = [
  {
    title: "Cycling Base Building",
    subtitle: "8-week plan for cyclists",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCNdAa6Vz9pzuShJuqQEDIzhJBH3FKxV-JkPpl4AXZBTIDKqgZwtXERKmMJi6JSXispWBxJUoDSWfFyVGvUUdR1RGgt0xikc-BxVjpF8FLMRe6B7QRNmIp0TgQENc6s8eDmGPXiFT62Xafc1ZP4HpbrESp2-wTDnQ3XmiF40Gfh-fseg8JMUad2bwB-m4nWvBFGte4PWK-q_Ci7NWiHN69whurv1otVnGB20_Zk1yIhbHAWXx7Y8_ik0c-ecai4WtyH43A4kRLBp4sf",
  },
  {
    title: "Strength Training for Climbers",
    subtitle: "6-week plan for climbers",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuArHCYbnPUKsXtDKPaEnjBeqasprLdhJiMpKL1cqNMHV0FTkXFeQLR-zQGEMLVF6NVv7c4uEeqBElA406xD_5faKtFYBBrtkuHqNmfpMXY-0qQqNMjoc4zSkVFDvoqAK1EXBpwxLWVgeejRtkCG1lW_c8vk3vLGn_Qt272OJmaZ8vJj2GUeVtPeI2fk_PQbFfQlXMF6-idi0bcKkpWbeOzpRq5hTHYEQEV1DAN33BZmaoVyLS_OampTb70_OyM7O9BHyMgk94ueix-V",
  },
  {
    title: "Triathlon Preparation",
    subtitle: "12-week plan for triathletes",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAuyLvvzqptDBikpGAed1JNmkiACALQxFm9B-knLXpovo3VQ2ESYEDreR2PvWAnVEpqCnIO34NXcHMAKNFQgfDSukSF7YXa2pJ_6Pye2nX8Wcg51g4mX7eXxU24F_a_tjjKSxJ15QTCKxn1NXV00JQq0_pd_Yru0F8PcQUtYgXB7scjf8-8OeWXr3skYdYU8MCJHUyzyy6VeMMUfxT47uY493RYlu96w-KyZ3vm9nHHOF4V4PqCnp9zho0vPhOOtsVgpzQZrmXeBf3K",
  },
];

export default function TrainingPlanLibrary() {
  return (
    <div className="flex items-stretch gap-3">
      {plans.map((plan) => (
        <TrainingPlanCard
          key={plan.title}
          title={plan.title}
          subtitle={plan.subtitle}
          imageUrl={plan.imageUrl}
        />
      ))}
    </div>
  );
}
