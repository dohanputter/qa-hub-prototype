import React, { useState, useEffect } from 'react';
import { MOCK_NOTIFICATIONS } from '../services/mockData';
import { Bell, Circle } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export const Notifications = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Bell /> Notifications
      </h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-100">
            {isLoading ? (
                // Skeleton Loader
                [1, 2, 3, 4].map((i) => (
                    <li key={i} className="p-4 flex items-start gap-3">
                        <div className="mt-1.5">
                            <Skeleton variant="circular" width={10} height={10} />
                        </div>
                        <div className="flex-1">
                            <Skeleton width="80%" height={20} className="mb-2" />
                            <Skeleton width="20%" height={14} />
                        </div>
                    </li>
                ))
            ) : (
                MOCK_NOTIFICATIONS.map(notif => (
                    <li key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                        <div className="mt-1.5">
                            <Circle size={10} className={notif.read ? "text-transparent" : "text-blue-500 fill-current"} />
                        </div>
                        <div>
                            <p className="text-gray-800 text-sm leading-relaxed hover:text-indigo-600 cursor-pointer font-medium">
                                {notif.text}
                            </p>
                            <span className="text-xs text-gray-400">{notif.time}</span>
                        </div>
                    </li>
                ))
            )}
        </ul>
      </div>
    </div>
  );
};