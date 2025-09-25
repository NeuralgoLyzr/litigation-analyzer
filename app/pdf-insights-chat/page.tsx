'use client'

import React from "react";
import PDFInsightsChatPage from "../../components/ui/pdf-insight-chat";
import LogoIcon from "../../components/ui/logosvg";
import { ProfileHeader } from "../../components/ProfileHeader";

export default function Home() {
  return (
    <div className=" overflow-auto">
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <LogoIcon />
          <div className='border-r-2 border border-[#292929] h-12'> </div>
          <div className='flex my-auto flex-col  '>
            <span>
              < p className='text-3xl font-bold text-purple-500'>
                Litigation Analyzer 
              </p>
            </span>
            <span>
              < p className='text-2xl font-bold text-[#292929] -mt-2'>
              Agent
              </p>
            </span>
          </div>
        </div>
        <ProfileHeader />
      </div>
      <div className="">
      <PDFInsightsChatPage />

      </div>
    </div>

  );
}
