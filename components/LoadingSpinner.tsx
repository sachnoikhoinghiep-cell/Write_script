
import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-8 mt-8">
            <div className="w-16 h-16 border-4 border-slate-700 border-t-sky-400 rounded-full animate-spin"></div>
        </div>
    );
};
