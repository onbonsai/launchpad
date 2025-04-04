import { CheckIcon } from '@heroicons/react/outline'
import React from 'react'

const BulletCheck = () => {
    return (
        <div className='flex justify-center items-center bg-brand-highlight rounded-full h-4 w-4'>
            <svg width="8" height="9" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.625 5.125L2.875 7L7.375 0.625" stroke="white" strokeWidth="1.5" />
            </svg>

        </div>
    )
}

export default BulletCheck