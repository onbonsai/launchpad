const DropDown = () => {
    return (
        <span className="absolute bg-card rounded-full h-[13px] w-[13px] mt-[13px] mr-[12px] inset-y-0 right-0 flex items-center justify-center pointer-events-none">
            <svg width="6" height="5" viewBox="0 0 6 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.5 1L3 3.5L5.5 1" stroke="white" strokeWidth="1.2" />
            </svg>
        </span>
    );
}

export default DropDown;