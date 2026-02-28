#!/usr/bin/env python3
"""
OpenProject API Connectivity Test

This script tests the connection to your OpenProject instance and validates
the configuration settings in config.py.
"""

import requests
from config import (
    CONFIG,
    PROJECT_MAPPINGS,
)
from requests.auth import HTTPBasicAuth


def test_api_connection():
    """Test basic API connectivity and authentication."""
    print("\n🔗 Testing OpenProject API Connection...")
    print(f"\nBase URL: {CONFIG['base_url']}")
    print(
        f"API Token: {CONFIG['api_token'][:10]}..."
        if CONFIG["api_token"]
        else "API Token: [NOT SET]"
    )

    if not CONFIG["api_token"]:
        print("\n❌ API Token is not configured!")
        print("   Set API_TOKEN in config.py and try again")
        return None

    try:
        session = requests.Session()
        session.auth = HTTPBasicAuth("apikey", CONFIG["api_token"])
        session.headers.update(
            {"Content-Type": "application/json", "Accept": "application/hal+json"}
        )

        # Test basic connectivity
        url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/users/me"
        print(f"\n📤 Sending request to: {url}")
        response = session.get(url, timeout=10)

        print(f"📥 Response Status: {response.status_code}")

        if response.status_code == 200:
            user_data = response.json()
            print("\n✅ API Connection Successful!")
            print(f"   Authenticated as: {user_data.get('name', 'Unknown')}")
            print(f"   User ID: {user_data.get('id', 'Unknown')}")
            print(f"   Email: {user_data.get('email', 'Unknown')}")
            return session
        elif response.status_code == 401:
            print("\n❌ Authentication Failed - Invalid API Token!")
            print(f"   Status Code: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            print("\n💡 Troubleshooting:")
            print("   1. Verify your API token in config.py")
            print("   2. Ensure the token has not expired")
            print("   3. Check if you have 'API' scope enabled in OpenProject")
            return None
        else:
            print("\n❌ Authentication Failed!")
            print(f"   Status Code: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return None

    except requests.exceptions.ConnectionError as e:
        print("\n❌ Connection Error!")
        print(f"   Could not connect to {CONFIG['base_url']}")
        print(f"   Error: {str(e)}")
        print("\n💡 Troubleshooting:")
        print("   1. Check your internet connection")
        print("   2. Verify the base URL is correct in config.py")
        print("   3. Ensure the OpenProject server is running and accessible")
        return None
    except requests.exceptions.Timeout:
        print("\n❌ Timeout Error!")
        print("   Request timed out after 10 seconds")
        print("\n💡 Troubleshooting:")
        print("   1. Check your internet connection")
        print("   2. Verify the OpenProject server is responding")
        print("   3. Try increasing timeout if server is slow")
        return None
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        return None


def test_projects(session):
    """Test access to configured projects."""
    print("\n📁 Testing Project Access...")

    project_results = {}

    for project_name, project_id in PROJECT_MAPPINGS.items():
        try:
            url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/projects/{project_id}"
            response = session.get(url, timeout=5)

            if response.status_code == 200:
                project_data = response.json()
                print(
                    f"✅ {project_name} (ID: {project_id}) - {project_data.get('name', 'Unknown')}"
                )
                project_results[project_name] = True
            elif response.status_code == 404:
                print(f"❌ {project_name} (ID: {project_id}) - Project not found")
                project_results[project_name] = False
            elif response.status_code == 403:
                print(f"⚠️  {project_name} (ID: {project_id}) - Access denied")
                project_results[project_name] = False
            else:
                print(
                    f"❌ {project_name} (ID: {project_id}) - Error {response.status_code}"
                )
                project_results[project_name] = False

        except Exception as e:
            print(f"❌ {project_name} (ID: {project_id}) - Error: {e}")
            project_results[project_name] = False

    return project_results


def test_work_package_creation(session):
    """Test work package creation permissions."""
    print("\n📋 Testing Work Package Creation Permissions...")

    # Test with the first available project
    test_project_id = None
    test_project_name = None

    for project_name, project_id in PROJECT_MAPPINGS.items():
        test_project_id = project_id
        test_project_name = project_name
        break

    if not test_project_id:
        print("❌ No projects configured for testing")
        return False

    try:
        # Test work package creation endpoint without actually creating
        url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/projects/{test_project_id}/work_packages/form"
        response = session.post(url, json={}, timeout=5)

        if response.status_code in [
            200,
            201,
            422,
        ]:  # 422 is validation error, which means endpoint works
            print(f"✅ Work package creation allowed in {test_project_name}")
            return True
        elif response.status_code == 403:
            print(f"❌ Work package creation denied in {test_project_name}")
            return False
        else:
            print(
                f"⚠️  Work package creation test inconclusive (Status: {response.status_code})"
            )
            return False

    except Exception as e:
        print(f"❌ Error testing work package creation: {e}")
        return False


def test_time_entry_creation(session):
    """Test time entry creation permissions."""
    print("\n⏰ Testing Time Entry Creation Permissions...")

    try:
        # Test time entry creation endpoint without actually creating
        url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/time_entries/form"
        response = session.post(url, json={}, timeout=5)

        if response.status_code in [
            200,
            201,
            422,
        ]:  # 422 is validation error, which means endpoint works
            print("✅ Time entry creation allowed")
            return True
        elif response.status_code == 403:
            print("❌ Time entry creation denied")
            return False
        else:
            print(
                f"⚠️  Time entry creation test inconclusive (Status: {response.status_code})"
            )
            return False

    except Exception as e:
        print(f"❌ Error testing time entry creation: {e}")
        return False


def get_project_mappings(session):
    """Retrieve all available projects from OpenProject API."""
    print("\n🗺️  Retrieving Project Mappings from OpenProject...")

    try:
        url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/projects"
        response = session.get(url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            projects = data.get("_embedded", {}).get("elements", [])

            print(f"\n📋 Available Projects ({len(projects)} total):")
            print("-" * 80)

            project_mappings = {}

            for project in projects:
                project_id = project.get("id")
                project_name = project.get("name", "Unknown")
                project_identifier = project.get("identifier", "Unknown")

                print(f"🔹 {project_name}")
                print(f"   ID: {project_id}")
                print(f"   Identifier: {project_identifier}")

                # Create mapping entry
                project_mappings[project_identifier.upper()] = project_id
                print(
                    f"   Suggested Mapping: '{project_identifier.upper()}': {project_id}"
                )
                print()

            # Generate config format
            print("📝 Project Mappings for config.py:")
            print("-" * 80)
            print("PROJECT_MAPPINGS = {")
            for identifier, proj_id in project_mappings.items():
                print(f"    '{identifier}': {proj_id},")
            print("}")

            return project_mappings

        elif response.status_code == 403:
            print("❌ Access denied - insufficient permissions to list projects")
            return None
        else:
            print(f"❌ Error retrieving projects: Status {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            return None

    except Exception as e:
        print(f"❌ Error retrieving project mappings: {e}")
        return None


def test_user_permissions(session):
    """Test user permissions and validate user IDs."""
    print("\n👤 Testing User Permissions...")

    accountable_id = CONFIG.get("accountable_user_id")
    assignee_id = CONFIG.get("assignee_user_id")

    for user_type, user_id in [
        ("Accountable", accountable_id),
        ("Assignee", assignee_id),
    ]:
        if user_id:
            try:
                url = f"{CONFIG['base_url'].rstrip('/')}/api/v3/users/{user_id}"
                response = session.get(url, timeout=5)

                if response.status_code == 200:
                    user_data = response.json()
                    print(
                        f"✅ {user_type} User (ID: {user_id}) - {user_data.get('name', 'Unknown')}"
                    )
                elif response.status_code == 404:
                    print(f"❌ {user_type} User (ID: {user_id}) - User not found")
                elif response.status_code == 403:
                    print(f"⚠️  {user_type} User (ID: {user_id}) - Access denied")
                else:
                    print(
                        f"❌ {user_type} User (ID: {user_id}) - Error {response.status_code}"
                    )

            except Exception as e:
                print(f"❌ Error checking {user_type} user: {e}")
        else:
            print(f"⚠️  {user_type} User ID not configured")


def main():
    """Run all API tests."""
    print("\n🚀 OpenProject API Configuration Test")
    print("=" * 50)

    session = test_api_connection()
    if not session:
        print("\n❌ Cannot proceed - API connection failed")
        print("\nTroubleshooting:")
        print("1. Check your base_url in config.py")
        print("2. Verify your api_token is correct")
        print("3. Ensure you have internet connectivity")
        return False

    project_results = test_projects(session)

    # Get available project mappings from API
    get_project_mappings(session)

    test_work_package_creation(session)

    test_time_entry_creation(session)

    test_user_permissions(session)

    # Summary
    print("\n📊 Test Summary")
    print("=" * 50)

    accessible_projects = sum(1 for result in project_results.values() if result)
    total_projects = len(project_results)

    print("✅ API Connection: Working")

    if accessible_projects < total_projects:
        print("\n⚠️  Some projects are not accessible:")
        for project_name, accessible in project_results.items():
            if not accessible:
                print(f"   - {project_name} (ID: {PROJECT_MAPPINGS[project_name]})")
        print("\nCheck permissions or update project IDs in config.py")

    print("\n🎉 API test completed!")

    return True


if __name__ == "__main__":
    main()
