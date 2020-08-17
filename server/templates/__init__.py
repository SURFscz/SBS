def invitation_role(intended_role):
    return " an administrator" if intended_role == "admin" \
        else " a member" if intended_role == "member" else " a manager"
