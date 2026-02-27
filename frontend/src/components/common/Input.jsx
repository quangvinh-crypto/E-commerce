import clsx from 'clsx';

const Input = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-gray-300 font-medium mb-2">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-4 py-3 bg-zinc-800 text-gray-100 rounded-lg border transition-colors',
          'placeholder-gray-500 focus:outline-none focus:border-amber-500',
          error ? 'border-red-500' : 'border-zinc-700',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;
