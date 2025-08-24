// utils/formatDateTime.js

function getOrdinal(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatDateTime(dateString) {
  const date = new Date(dateString);

  const day = date.getDate();
  const ordinal = getOrdinal(day);
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${day}${ordinal} ${month}, ${year} (${time})`;
}


export function formatCustomDateTime(dateStr) {
  const date = new Date(dateStr);

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const getDaySuffix = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formattedTime = `${(hours % 12 || 12)}:${minutes.toString().padStart(2, '0')}${hours >= 12 ? 'pm' : 'am'}`;

  return `${day}${getDaySuffix(day)} ${month}, ${year} (${formattedTime})`;
};

