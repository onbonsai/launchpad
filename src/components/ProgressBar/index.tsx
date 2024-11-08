interface ProgressBarProps {
  progress: number; // expects a value between 0 and 100
  borderClass?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, borderClass = "border-dark-grey" }) => {
  // Ensure progress is within bounds
  const validProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full rounded-full border ${borderClass} bg-transparent shadow-sm`}>
      <div
        className="bg-gradient text-md w-full py-2 px-3 rounded-full"
        style={{ width: `${validProgress}%`, marginLeft: validProgress == 0 ? '8px' : '0px', animation: 'pulse 2s infinite' }}
      >
        {validProgress}%
      </div>
    </div>
  );
};

export default ProgressBar;