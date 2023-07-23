import { useState } from "react";

export default function BlogSlugInput({ value, handleChange, className }: { value?: string, handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void, className?: string }) {
    const [slug, setSlug] = useState(value);

    function validateAndHandleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const regex = /^[0-9a-zA-Z(\_)]+$/;
        const slug = event.target.value;

        if (slug !== '' && !regex.test(slug)) return;

        setSlug(slug);
        handleChange(event);
    }

    return <input className={className} type="text" name="slug" placeholder="블로그 주소를 적어 주세요." value={slug} onChange={validateAndHandleChange} maxLength={20} pattern="\w+" />
}
