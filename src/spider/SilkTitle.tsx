// Hand-drawn single-line letterforms, doubled into strands of silk.
const letters: Record<string, string> = {
  S: 'M35 9Q12 -1 7 15Q2 28 22 32Q43 36 33 51Q24 65 3 54',
  P: 'M7 60Q11 32 7 3Q39 -1 36 20Q35 36 9 30',
  I: 'M3 5Q19 9 33 3M19 7Q13 33 19 57M3 60Q19 55 34 60',
  D: 'M6 59Q10 29 6 3Q43 0 39 31Q37 60 6 59',
  E: 'M37 4L8 6L6 59L36 56M8 30L30 29',
  R: 'M6 60L9 4Q39 0 37 21Q34 34 9 29M21 31Q30 46 41 60',
  O: 'M20 3C-4 1 -1 61 21 60C47 61 46 3 20 3Z',
  L: 'M9 2Q5 33 8 59L38 56',
  T: 'M1 6Q19 1 42 5M23 5Q17 32 20 60',
  A: 'M1 60Q10 25 22 2Q34 28 43 60M10 38Q24 34 35 39',
}
const title = 'SPIDER SOLITAIRE'

export function SilkTitle() {
  return <h1 className="silk-title">
    <span className="sr-only">Spider Solitaire</span>
    <svg viewBox="0 0 760 128" aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="silk-shine" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fffdf8" /><stop offset="1" stopColor="#c9b8e9" />
        </linearGradient>
      </defs>
      <g stroke="#b7a4da" strokeWidth=".7" opacity=".58">
        <path d="M0 3Q180 57 380 29Q580 53 760 3M0 0L40 30M760 0L720 30M40 30L15 95M720 30L745 95" />
        <path d="M15 95Q35 79 55 86M24 69Q40 60 63 68M31 49Q49 43 70 49M745 95Q724 79 703 86M736 69Q719 60 697 68M729 49Q711 43 690 49" />
      </g>
      {Array.from(title).map((letter, index) => letter === ' ' ? null :
        <g key={index} transform={`translate(${20 + index * 45} ${36 + Math.sin(index * 2.1) * 3}) rotate(${Math.sin(index) * 3} 20 30)`}>
          <path d={letters[letter]} stroke="#86709e" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" opacity=".4" transform="translate(1 1)" />
          <path d={letters[letter]} stroke="url(#silk-shine)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d={letters[letter]} stroke="#fffdf8" strokeWidth=".45" transform="translate(2 -1)" opacity=".65" />
          <path d="M8 5L20 -9L35 8M8 5Q20 4 20 -9Q24 4 35 8" stroke="#c8b7e0" strokeWidth=".55" opacity=".65" />
          {index % 3 === 0 && <path d="M9 30L30 39L9 53M9 37L24 42M9 46L18 45" stroke="#d6c6e9" strokeWidth=".6" opacity=".7" />}
          {index % 4 === 0 && <g stroke="#cdbde7" strokeWidth=".7">
            <path d="M20 61Q18 75 23 84" />
            <circle cx="23" cy="85" r="1.7" fill="#dfd2f3" stroke="none" />
          </g>}
        </g>)}
    </svg>
  </h1>
}
