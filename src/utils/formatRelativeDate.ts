export default (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds} sec ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hrs ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} mo ago`;
  }
  const years = Math.floor(months / 12);
  return `${years} yr ago`;
}