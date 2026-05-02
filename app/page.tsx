export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      
      {/* 標題 */}
      <h1 className="text-4xl md:text-6xl font-bold text-center leading-tight">
        一玄 AI 投資系統
      </h1>

      {/* 副標 */}
      <p className="mt-6 text-lg md:text-xl text-gray-300 text-center max-w-2xl">
        結合 FCN、幣安策略與 AI 風控  
        打造你的專屬投資決策系統
      </p>

      {/* CTA */}
      <div className="mt-10 flex gap-4">
        <a
          href="#"
          className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
        >
          預約諮詢
        </a>

        <a
          href="#"
          className="border border-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-black"
        >
          查看系統
        </a>
      </div>

    </main>
  );
}