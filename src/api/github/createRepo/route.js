const { checkRepoExists } = require('./checkRepoExists');
const { queryDatabase } = require('../../../services/dbQuery');

function validateRepoName(repoName) {
    const errors = [];
    
    if (!repoName) {
        errors.push('Repository name is required');
        return { isValid: false, errors };
    }
    
    repoName = String(repoName).trim();
    
    if (repoName.length < 1 || repoName.length > 100) {
        errors.push('Repository name must be between 1 and 100 characters');
    }
    
const validNameRegex = /^[a-zA-Z0-9_\- ]+$/;
    // console.log("validNameRegex.test(repoName)", validNameRegex.test(repoName))
    if (!validNameRegex.test(repoName)) {
        errors.push('Repository name can only contain alphanumeric characters, hyphens (-), underscores (_), and periods (.)');
    }
    
    if (repoName.startsWith('.') || repoName.startsWith('-') || repoName.startsWith('_') ||
        repoName.endsWith('.') || repoName.endsWith('-') || repoName.endsWith('_')) {
        errors.push('Repository name cannot start or end with special characters');
    }
    
    if (/[._-]{2,}/.test(repoName)) {
        errors.push('Repository name cannot contain consecutive special characters');
    }
    
    const reservedNames = [
        'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 
        'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 
        'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    if (reservedNames.includes(repoName.toUpperCase())) {
        errors.push('Repository name cannot be a reserved system name');
    }
    
    if (/^\.+$/.test(repoName)) {
        errors.push('Repository name cannot be only dots');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedName: repoName
    };
}

function validateDescription(description) {
    const errors = [];
    
    if (description) {
        description = String(description).trim();
        
        if (description.length > 350) {
            errors.push('Repository description cannot exceed 350 characters');
        }
        
        const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
        if (invalidChars.test(description)) {
            errors.push('Repository description contains invalid characters');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedDescription: description || 'Project repository'
    };
}

async function checkIfRepoExists(repoName, github_token) {
    try {
        const response = await fetch(`https://api.github.com/user/repos`, {
            method: 'GET',
            headers: {
                Authorization: `token ${github_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        
        if (response.ok) {
            const repos = await response.json();
            const existingRepo = repos.find(repo => 
                repo.name.toLowerCase() === repoName.toLowerCase()
            );
            return !!existingRepo;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking repository existence:', error);
        return false;
    }
}

// VERSION 1: Returns Response objects (for API endpoints)
async function createGitHubRepo(repoName, description, github_token) {
    // console.log("Creating repo:", repoName, description, github_token);

    if (!github_token) {
        // console.log("GitHub token is required")
        return new Response(
            JSON.stringify({ error: 'GitHub token is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const nameValidation = validateRepoName(repoName);
    if (!nameValidation.isValid) {
        // console.log("Invalid repository name")
        return new Response(
            JSON.stringify({ 
                error: 'Invalid repository name', 
                details: nameValidation.errors 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
// console.log("name is valid")
    const descValidation = validateDescription(description);
    if (!descValidation.isValid) {
        // console.log("Invalid repository description")
        return new Response(
            JSON.stringify({ 
                error: 'Invalid repository description', 
                details: descValidation.errors 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    // console.log("description is valid")

    const sanitizedRepoName = nameValidation.sanitizedName;
    const sanitizedDescription = descValidation.sanitizedDescription;

    try {
        const repoExists = await checkIfRepoExists(sanitizedRepoName, github_token);
        
        if (repoExists) {
            // console.log("Repository '${sanitizedRepoName}' already exists in your account")
            return new Response(
                JSON.stringify({ 
                    error: `Repository '${sanitizedRepoName}' already exists in your account` 
                }),
                { status: 409, headers: { 'Content-Type': 'application/json' } }
            );
        }
        // console.log("repo is not exists")

        const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                Authorization: `token ${github_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                name: sanitizedRepoName,
                private: false,
                description: sanitizedDescription,
            }),
        });
        // console.log("repoResponse is ", repoResponse)

        if (!repoResponse.ok) {
            const errorData = await repoResponse.json();
            let errorMessage = errorData.message || 'Unknown GitHub API error';
            if (errorData.errors && errorData.errors.length > 0) {
                const specificErrors = errorData.errors.map(err => err.message).join(', ');
                errorMessage += `. Details: ${specificErrors}`;
            }
            
            return new Response(
                JSON.stringify({ error: errorMessage }),
                { status: repoResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await repoResponse.json();
        
        return new Response(
            JSON.stringify({ 
                repoUrl: data.html_url, 
                repoName: data.name,
                message: 'Repository created successfully'
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Internal server error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// VERSION 2: Throws errors (better for internal function calls)
async function createGitHubRepoThrows(repoName, description, github_token) {
    // console.log("Creating repo:", repoName, description);

    if (!github_token) {
        throw new Error('GitHub token is required');
    }

    const nameValidation = validateRepoName(repoName);
    if (!nameValidation.isValid) {
        const error = new Error('Invalid repository name');
        error.details = nameValidation.errors;
        error.statusCode = 400;
        throw error;
    }

    const descValidation = validateDescription(description);
    if (!descValidation.isValid) {
        const error = new Error('Invalid repository description');
        error.details = descValidation.errors;
        error.statusCode = 400;
        throw error;
    }

    const sanitizedRepoName = nameValidation.sanitizedName;
    const sanitizedDescription = descValidation.sanitizedDescription;

    try {
        const repoExists = await checkIfRepoExists(sanitizedRepoName, github_token);
        
        if (repoExists) {
            const error = new Error(`Repository '${sanitizedRepoName}' already exists in your account`);
            error.statusCode = 409;
            throw error;
        }

        const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                Authorization: `token ${github_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                name: sanitizedRepoName,
                private: false,
                description: sanitizedDescription,
            }),
        });

        if (!repoResponse.ok) {
            const errorData = await repoResponse.json();
            let errorMessage = errorData.message || 'Unknown GitHub API error';
            if (errorData.errors && errorData.errors.length > 0) {
                const specificErrors = errorData.errors.map(err => err.message).join(', ');
                errorMessage += `. Details: ${specificErrors}`;
            }
            
            const error = new Error(`GitHub API Error: ${errorMessage}`);
            error.statusCode = repoResponse.status;
            error.details = errorData;
            throw error;
        }

        const data = await repoResponse.json();
        
        return {
            repoUrl: data.html_url, 
            repoName: data.name,
            message: 'Repository created successfully'
        };

    } catch (error) {
        if (error.statusCode) {
            // Re-throw known errors
            throw error;
        }
        
        // Handle unexpected errors
        console.error('Internal server error:', error);
        const internalError = new Error('Internal server error');
        internalError.statusCode = 500;
        throw internalError;
    }
}

module.exports = { 
    createGitHubRepo, 
    createGitHubRepoThrows,
    validateRepoName, 
    validateDescription, 
    checkIfRepoExists 
};