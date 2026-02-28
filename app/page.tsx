"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Folder, Clock, MoreVertical, BookOpen } from "lucide-react";

export default function Dashboard() {
  const [sessions, setSessions] = useState([
    { id: "1", title: "Física Cuántica B.", date: "2d ago", status: "Active" },
    { id: "2", title: "Historia Moderna", date: "5d ago", status: "Completed" },
  ]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      {/* Vercel-like Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold text-sm">
            N
          </div>
          <span className="font-semibold text-lg tracking-tight">Nabook</span>
          <span className="text-gray-400 dark:text-zinc-600 mx-2">/</span>
          <span className="font-medium text-gray-600 dark:text-zinc-300">diego</span>
        </div>
        <div>
          <button className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500"></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Dashboard Title & Actions */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Study Sessions</h1>
          <button 
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={() => {
              // Navegar al nuevo editor (Mock ID por ahora)
              const mockId = crypto.randomUUID();
              window.location.href = `/editor/${mockId}`;
            }}
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Filter Tabs Mock */}
        <div className="flex gap-6 border-b border-gray-200 dark:border-zinc-800 mb-8 text-sm">
          <button className="pb-3 border-b-2 border-black dark:border-white font-medium">All Sessions</button>
          <button className="pb-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Recent</button>
          <button className="pb-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Favorites</button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Search sessions..." 
            className="w-full sm:max-w-md px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow"
          />
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Link 
              key={session.id} 
              href={`/editor/${session.id}`}
              className="group block p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:shadow-lg dark:hover:border-zinc-700 transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                  <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {session.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4 line-clamp-2">
                Apuntes y preparativos para el examen final.
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <Folder className="w-3 h-3" /> Nabook
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {session.date}
                </span>
              </div>
            </Link>
          ))}
          
          {/* Empty State / Create Box */}
          <button 
            onClick={() => window.location.href = `/editor/${crypto.randomUUID()}`}
            className="group flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl hover:border-gray-400 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all duration-200 aspect-[4/3]"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Create New Session</span>
          </button>
        </div>
      </main>
    </div>
  );
}
