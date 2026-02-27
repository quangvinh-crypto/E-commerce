const LoadingSpinner = ({ size = 'md', text = 'Đang tải...' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className={`animate-spin rounded-full border-t-amber-500 border-b-amber-500 border-zinc-700 ${sizeClasses[size]}`}
      />
      {text && <p className="mt-4 text-gray-400 font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
