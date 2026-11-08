function Svg({ children, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const icons = {
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9a7 7 0 1 1 0 14H9" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9h-9a7 7 0 1 0 0 14h4" />
    </>
  ),
  heading: (
    <>
      <path d="M6 5v14" />
      <path d="M18 5v14" />
      <path d="M6 12h12" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  quote: <path d="M7 7h4v6H6a3 3 0 0 1 1-6Zm10 0h4v6h-5a3 3 0 0 1 1-6Z" />,
  codeBlock: (
    <>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
    </>
  ),
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <path d="M15 5H9m6 14H9M14 5 10 19" />,
  strike: (
    <>
      <path d="M6 12h12" />
      <path d="M16 7a3 3 0 0 0-3-2h-2a3 3 0 0 0 0 6" />
      <path d="M8 17a3 3 0 0 0 3 2h2.5a3 3 0 0 0 2.2-5" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
  underline: (
    <>
      <path d="M7 5v6a5 5 0 0 0 10 0V5" />
      <path d="M6 19h12" />
    </>
  ),
  highlight: (
    <>
      <path d="m9 11 4 4" />
      <path d="m15 7 2 2" />
      <path d="M8.5 16.5 5 20" />
      <path d="m14 6 4 4-7.5 7.5H7v-3.5z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </>
  ),
  superscript: (
    <>
      <path d="M4 19 12 7" />
      <path d="m12 19-8-12" />
      <path d="M19 8V3h-1" />
    </>
  ),
  subscript: (
    <>
      <path d="M4 7 12 19" />
      <path d="m12 7-8 12" />
      <path d="M19 21v-5h-1" />
    </>
  ),
  alignLeft: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h14" />
    </>
  ),
  alignCenter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M5 18h14" />
    </>
  ),
  alignRight: (
    <>
      <path d="M4 6h16" />
      <path d="M10 12h10" />
      <path d="M6 18h14" />
    </>
  ),
  alignJustify: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  json: (
    <>
      <path d="M8 6H6v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4h2" />
      <path d="M16 6h2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4h-2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" />,
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m7 16 3.5-3.5 2.5 2.5L16 12l3 4" />
    </>
  ),
  hr: <path d="M4 12h16" />,
  table: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M4 10h16M4 15h16M10 5v14M15 5v14" />
    </>
  ),
  rowAbove: (
    <>
      <rect x="4" y="10" width="16" height="8" rx="1" />
      <path d="M12 8V3M9.5 5.5 12 3l2.5 2.5" />
    </>
  ),
  rowBelow: (
    <>
      <rect x="4" y="6" width="16" height="8" rx="1" />
      <path d="M12 16v5M9.5 18.5 12 21l2.5-2.5" />
    </>
  ),
  colLeft: (
    <>
      <rect x="10" y="4" width="8" height="16" rx="1" />
      <path d="M8 12H3M5.5 9.5 3 12l2.5 2.5" />
    </>
  ),
  colRight: (
    <>
      <rect x="6" y="4" width="8" height="16" rx="1" />
      <path d="M16 12h5M18.5 9.5 21 12l-2.5 2.5" />
    </>
  ),
  merge: (
    <>
      <rect x="4" y="6" width="7" height="12" rx="1" />
      <rect x="13" y="6" width="7" height="12" rx="1" />
      <path d="M8 12h8" />
    </>
  ),
  split: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <path d="M12 6v12" />
    </>
  ),
  headerRow: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M4 10h16" />
    </>
  ),
  headerCol: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M10 5v14" />
    </>
  ),
  headerCell: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M4 12h8M12 5v14" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 12h6l1-12" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3v-3H7.5A2.5 2.5 0 0 1 5 13.5z" />
    </>
  ),
}

export default function Icon({ name, className }) {
  return <Svg className={className}>{icons[name]}</Svg>
}
