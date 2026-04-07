import { useEffect, useState } from 'react'
import { VscClose, VscTrash } from 'react-icons/vsc'
import type { AccessType, ProjectMember } from '@/core/projectManager'
import Spinner from '@/components/Spinner/Spinner'
import ModalShell from '@/components/ModalShell/ModalShell'

import '@/components/ManageMembersModal/ManageMembersModal.css'

type Props = {
    projectName: string
    canManage?: boolean
    onLoadMembers(): Promise<ProjectMember[]>
    onAddMember(username: string, accessType: AccessType): Promise<ProjectMember>
    onUpdateMemberAccess(username: string, accessType: AccessType): Promise<ProjectMember>
    onRemoveMember(userId: string): Promise<void>
    onClose(): void
}

function ManageMembersModal({
    projectName,
    canManage = true,
    onLoadMembers,
    onAddMember,
    onUpdateMemberAccess,
    onRemoveMember,
    onClose,
}: Props) {
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [newUsername, setNewUsername] = useState('')
    const [newAccessType, setNewAccessType] = useState<AccessType>('r')
    const [saving, setSaving] = useState(false)
    const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const list = await onLoadMembers()
                if (active) {
                    setMembers(list)
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Failed to load members')
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }
        load()
        return () => {
            active = false
        }
    }, [onLoadMembers])

    const findMemberByUsername = (username: string): ProjectMember | undefined => {
        const target = username.toLowerCase()
        return members.find((member) => member.username.toLowerCase() === target)
    }

    const addOrUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault()
        const username = newUsername.trim()
        if (username.length === 0) {
            setError('Username is required')
            return
        }
        setSaving(true)
        setError(null)
        try {
            const existing = findMemberByUsername(username)
            const updated =
                existing == null
                    ? await onAddMember(username, newAccessType)
                    : await onUpdateMemberAccess(existing.username, newAccessType)

            setMembers((prev) => {
                const index = prev.findIndex((m) => m.userId === updated.userId)
                if (index < 0) return [...prev, updated].sort((a, b) => a.username.localeCompare(b.username))
                const next = [...prev]
                next[index] = updated
                return next
            })
            setNewUsername('')
            setNewAccessType('r')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save member')
        } finally {
            setSaving(false)
        }
    }

    const updateAccess = async (username: string, accessType: AccessType) => {
        setError(null)
        const member = findMemberByUsername(username)
        if (member == null) return
        setBusyMemberId(member.userId)
        try {
            const updated = await onUpdateMemberAccess(username, accessType)
            setMembers((prev) => prev.map((m) => (m.userId === updated.userId ? updated : m)))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update member access')
        } finally {
            setBusyMemberId(null)
        }
    }

    const removeMember = async (userId: string) => {
        setError(null)
        setBusyMemberId(userId)
        try {
            await onRemoveMember(userId)
            setMembers((prev) => prev.filter((m) => m.userId !== userId))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove member')
        } finally {
            setBusyMemberId(null)
        }
    }

    return (
        <ModalShell className='members-modal' onClose={onClose} ariaLabelledBy='members-modal-title'>
            <div className='members-modal-header'>
                <div>
                    <h2 className='members-modal-title' id='members-modal-title'>
                        {canManage ? 'Manage members' : 'Project members'}
                    </h2>
                    <p className='members-modal-subtitle'>{projectName}</p>
                </div>
                <button className='members-modal-close' onClick={onClose} aria-label='Close'>
                    <VscClose size={18} />
                </button>
            </div>

            {canManage && (
                <form className='members-add-form' onSubmit={addOrUpdateMember}>
                    <div className='members-field'>
                        <label htmlFor='member-username'>Username</label>
                        <input
                            id='member-username'
                            type='text'
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder='username'
                            disabled={saving}
                        />
                    </div>
                    <div className='members-field'>
                        <label htmlFor='member-access'>Access</label>
                        <select
                            id='member-access'
                            value={newAccessType}
                            onChange={(e) => setNewAccessType(e.target.value as AccessType)}
                            disabled={saving}
                        >
                            <option value='r'>Read only</option>
                            <option value='rw'>Read / Write</option>
                        </select>
                    </div>
                    <button
                        className='members-add-btn'
                        type='submit'
                        disabled={saving || newUsername.trim().length === 0}
                    >
                        {saving && <Spinner size={14} />}
                        {saving ? 'Saving...' : 'Add / Update'}
                    </button>
                </form>
            )}

            {error != null && <p className='members-error'>{error}</p>}

            <div className='members-list'>
                {loading ? (
                    <div className='members-empty members-loading'>
                        <Spinner size={16} /> Loading members...
                    </div>
                ) : members.length === 0 ? (
                    <p className='members-empty'>No members yet</p>
                ) : (
                    members.map((member) => (
                        <div key={member.userId} className='member-row'>
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
                                            onChange={(e) =>
                                                updateAccess(member.username, e.target.value as AccessType)
                                            }
                                            disabled={busyMemberId === member.userId}
                                        >
                                            <option value='r'>Read</option>
                                            <option value='rw'>Read / Write</option>
                                        </select>
                                        <button
                                            type='button'
                                            className='member-remove-btn'
                                            title='Remove member'
                                            disabled={busyMemberId === member.userId}
                                            onClick={() => removeMember(member.userId)}
                                        >
                                            {busyMemberId === member.userId ? (
                                                <Spinner size={14} />
                                            ) : (
                                                <VscTrash size={14} />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span className='member-access-readonly'>
                                        {member.isOwner
                                            ? 'Owner'
                                            : member.accessType === 'rw'
                                              ? 'Read / Write'
                                              : 'Read only'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ModalShell>
    )
}

export default ManageMembersModal
