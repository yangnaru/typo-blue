export default function Button({ content, disabled = false, onClick }: { content: string, disabled?: boolean, onClick: () => void }) {
    return (
        <button className="border border-blue-500 p-1 rounded-sm hover:bg-blue-300 hover:text-black" disabled={disabled} onClick={onClick}>{content}</button>
    )
}
