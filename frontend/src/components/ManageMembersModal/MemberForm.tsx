import type { AccessType } from '@/core/projectManager'

import Spinner from '@/components/Spinner/Spinner'

type Props = {
    username: string
    accessType: AccessType
    isSubmitting: boolean
    onUsernameChange(username: string): void
    onAccessTypeChange(accessType: AccessType): void
    onSubmit(event: React.FormEvent): void
}

function MemberForm({ username, accessType, isSubmitting, onUsernameChange, onAccessTypeChange, onSubmit }: Props) {
    return (
        <form className='members-add-form' onSubmit={onSubmit}>
            <div className='members-field'>
                <label htmlFor='member-username'>Username</label>
                <input
                    id='member-username'
                    type='text'
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    placeholder='username'
                    disabled={isSubmitting}
                />
            </div>
            <div className='members-field'>
                <label htmlFor='member-access'>Access</label>
                <select
                    id='member-access'
                    value={accessType}
                    onChange={(event) => onAccessTypeChange(event.target.value as AccessType)}
                    disabled={isSubmitting}
                >
                    <option value='r'>Read only</option>
                    <option value='rw'>Read / Write</option>
                </select>
            </div>
            <button className='members-add-btn' type='submit' disabled={isSubmitting || username.trim().length === 0}>
                {isSubmitting && <Spinner size={14} />}
                {isSubmitting ? 'Saving...' : 'Add / Update'}
            </button>
        </form>
    )
}

export default MemberForm
