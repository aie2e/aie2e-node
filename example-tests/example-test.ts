import { testCase, testSession } from "../src/core.ts";

// Test case for basic form visibility
testCase(`Steps to execute:
- Go to https://testpages.eviltester.com/styled/validation/input-validation.html.
- Verify that the input validation form is visible and contains all required fields.
Acceptance Criteria:
- The form should be present with First Name, Last Name, Age, Country, and Notes fields.
- The submit button should be visible.`,
    {use_vision: true});

// Test case for last name validation (too short)
testCase(`Steps to execute:
- Fill in the first name field with "John".
- Fill in the last name field with "S" (too short for last name requirement).
- Fill in the age field with "25".
- Select "United States of America" from the country dropdown.
- Submit the form.
Acceptance Criteria:
- An error message should appear indicating the last name is too short.
- The form should not submit successfully.`, {
    initial_actions: [
        { action: "go_to_url", arguments: { url: "https://testpages.eviltester.com/styled/validation/input-validation.html" } }
    ]});

// Test session to submit valid form data and verify results within a persistent browser session
testSession("Form submission test", { allowedDomains: ["https://*eviltester.com"] })
    // Test case for valid form submission
    .testCase(`Steps to execute:
- Fill in the first name field with "John".
- Fill in the last name field with "Smith-Johnson" (meets minimum requirement).
- Fill in the age field with "25".
- Select "United States of America" from the country dropdown.
- Submit the form.
Acceptance Criteria:
- The form should submit successfully without any validation errors.
- The next page with heading "Input Validation Response" should be displayed.
Note: Validation warnings appearing on the confirmation page are acceptable.`, {
        initial_actions: [
            { action: "go_to_url", arguments: { url: "https://testpages.eviltester.com/styled/validation/input-validation.html" } }
        ]})
    // Test case to verify submitted data on confirmation page
    .testCase(`Steps to execute:
- Remain on the confirmation page after the previous test case.
- Locate the form submission results table.
- Verify that the table contains the correct submitted values.
Acceptance Criteria:
- The first name should be "John".
- The last name should be "Smith-Johnson".
- The age should be "25".
- The country should be "United States of America".`)
    // Run the test session with multiple test cases
    .commit();