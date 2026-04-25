import '@/components/ManageMembersModal/ManageMembersModal.css'

import { useState } from 'react'
import { VscClose } from 'react-icons/vsc'

import MemberForm from '@/components/ManageMembersModal/MemberForm'
import MemberRow from '@/components/ManageMembersModal/MemberRow'
import ModalShell from '@/components/ModalShell/ModalShell'
import Spinner from '@/components/Spinner/Spinner'
import type { AccessType, ProjectMember } from '@/core/projectManager'
import useAsyncEffect from '@/hooks/useAsyncEffect'

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

    useAsyncEffect(
        async (isAborted) => {
            setLoading(true)
            setError(null)

            try {
                const list = await onLoadMembers()
                if (isAborted()) {
                    return
                }

                setMembers(list)
            } catch (err) {
                if (isAborted()) {
                    return
                }

                setError(err instanceof Error ? err.message : 'Failed to load members')
            } finally {
                if (!isAborted()) {
                    setLoading(false)
                }
            }
        },
        undefined,
        [onLoadMembers],
    )

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
                <button
                    type='button'
                    className='members-modal-close modal-close-btn'
                    onClick={onClose}
                    aria-label='Close'
                >
                    <VscClose />
                </button>
            </div>

            {canManage && (
                <MemberForm
                    username={newUsername}
                    accessType={newAccessType}
                    isSubmitting={saving}
                    onUsernameChange={setNewUsername}
                    onAccessTypeChange={setNewAccessType}
                    onSubmit={addOrUpdateMember}
                />
            )}

            {error != null && <p className='members-error modal-error'>{error}</p>}

            <div className='members-list'>
                {loading ? (
                    <div className='members-empty members-loading' aria-label='Fetching members'>
                        <Spinner size={16} />
                    </div>
                ) : members.length === 0 ? (
                    <p className='members-empty'>No members yet</p>
                ) : (
                    members.map((member) => (
                        <MemberRow
                            key={member.userId}
                            member={member}
                            canManage={canManage}
                            isBusy={busyMemberId === member.userId}
                            onUpdateAccess={updateAccess}
                            onRemove={removeMember}
                        />
                    ))
                )}
            </div>
        </ModalShell>
    )
}

export default ManageMembersModal
