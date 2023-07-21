import subprocess


def run_git_command(command):
    try:
        result = subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True, text=True)
        return result.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing Git command: {e.output}")
        return None


def get_current_tag():
    return run_git_command("git describe --abbrev=0 --tags")


def get_latest_commit_hash():
    return run_git_command("git rev-parse HEAD")


def get_latest_commit_message():
    return run_git_command("git log -1 --pretty=%B")


def get_latest_commit_author():
    return run_git_command("git log -1 --pretty=%an")


if __name__ == "__main__":
    repo_path = "./"  # Replace this with the path to your Git repository

    if not repo_path:
        print("Please provide the path to your Git repository.")
    else:
        try:
            # Change the working directory to the repository path
            subprocess.check_output(f"cd {repo_path}", shell=True)

            # Get and print the information
            current_tag = get_current_tag()
            latest_commit_hash = get_latest_commit_hash()
            latest_commit_message = get_latest_commit_message()
            latest_commit_author = get_latest_commit_author()

            print(f"Current Tag: {current_tag}")
            print(f"Latest Commit Hash: {latest_commit_hash}")
            print(f"Latest Commit Message: {latest_commit_message}")
            print(f"Latest Commit Author: {latest_commit_author}")
        except FileNotFoundError:
            print("Invalid repository path or Git not installed.")
