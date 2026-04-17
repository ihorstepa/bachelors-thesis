import { VscTrash } from 'react-icons/vsc'

import Spinner from '@/components/Spinner/Spinner'
import type { AccessType, ProjectMember } from '@/core/projectManager'

type Props = {
    member: ProjectMember
    canManage: boolean
    isBusy: boolean
    onUpdateAccess(username: string, accessType: AccessType): void
    onRemove(userId: string): void
}

function getReadonlyAccessLabel(member: ProjectMember): string {
    if (member.isOwner) {
        return 'Owner'
    }
    return member.accessType === 'rw' ? 'Read / Write' : 'Read only'
}

function MemberRow({ member, canManage, isBusy, onUpdateAccess, onRemove }: Props) {
    return (
        <div className='member-row'>
            <div className='member-main'>
                <div className='member-avatar'>{member.username.slice(0, 1).toUpperCase()}</div>
                <div>
                    <p className='member-username'>{member.username}</p>
                    <p className='member-email'>{member.email}</p>
                </div>
            </div>
            <div className='member-actions'>
                {canManage && !member.isOwner ? (
                    <>
                        <select
                            value={member.accessType}
                            onChange={(e) => onUpdateAccess(member.username, e.target.value as AccessType)}
                            disabled={isBusy}
                        >
                            <option value='r'>Read</option>
                            <option value='rw'>Read / Write</option>
                        </select>
                        <button
                            type='button'
                            className='member-remove-btn'
                            title='Remove member'
                            disabled={isBusy}
                            onClick={() => onRemove(member.userId)}
                        >
                            {isBusy ? <Spinner size={14} /> : <VscTrash size={14} />}
                        </button>
                    </>
                ) : (
                    <span className='member-access-readonly'>{getReadonlyAccessLabel(member)}</span>
                )}
            </div>
        </div>
    )
}

export default MemberRow
