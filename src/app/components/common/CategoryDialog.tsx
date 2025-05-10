import { FC } from "react";
type categoriesProps = {
  tabName: string;
  action: () => void;
};
interface CategoryDialogProps {
  isOpen: boolean;
  handleClose: () => void;
  categories: categoriesProps[];
}

export const CategoryDialog: FC<CategoryDialogProps> = ({
  isOpen,
  handleClose,
  categories,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      className="fixed top-0 left-0 z-50 flex items-center justify-center w-screen h-screen bg-opacity-20 bg-black/70"
    >
      <ul className="flex flex-col items-center justify-center w-full gap-8 ">
        {categories.map((cat, i) => (
          <li
            className="w-full text-center text-white cursor-pointer hover:bg-white"
            onClick={cat.action}
            key={i}
          >
            {cat.tabName}
          </li>
        ))}
      </ul>
      <button
        className="absolute bottom-2.5 left-1/2 -translate-x-1/2"
        onClick={handleClose}
      >
        close
      </button>
    </div>
  );
};
