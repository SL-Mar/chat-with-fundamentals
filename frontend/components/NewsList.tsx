'use client'

import { Set_News } from '../types/fundamental'

interface NewsListProps {
  data: Set_News[]
}

export default function NewsList({ data }: NewsListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center italic mt-4">
        No news articles available.
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-inner overflow-auto">

      {data.map((set) => (
        <div key={set.Ticker} className="mb-6">
          <h3 className="text-white font-bold mb-2">{set.Ticker}</h3>
          <p className="text-sm text-gray-400 mb-2 italic">{set.Present}</p>

          <ul className="space-y-4">
            {set.News.map((item, idx) => (
              <li key={idx} className="border-l-4 border-indigo-500 pl-4">
                <a
                  href={item.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  {item.Title}
                </a>
                <p className="text-xs text-gray-400 mt-1 italic">{item.Date}</p>
                <p className="text-sm text-gray-300 mt-1 line-clamp-3">{item.Content}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
