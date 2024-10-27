/* eslint-disable @typescript-eslint/no-explicit-any */
import { ID } from "appwrite";
import { INewPost, INewUser, IUpdatePost } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config";
import { Query } from "appwrite";


// Create a new user account (SIGN UP)
export async function createUserAccount(user: INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name
        );

        if (!newAccount) {
            throw new Error("Account creation failed");
        }

        const avatarUrl = avatars.getInitials(user.name);

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl
        });

        return newUser;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


// Save user details to the database
export async function saveUserToDB(user: {
    accountId: string;
    name: string;
    email: string;
    username?: string;
    imageUrl: string;
}) {
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user
        );

        return newUser;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


// Sign in to an existing user account
export async function signInAccount(user: {
    email: string;
    password: string;
}) {
    try {
        const session = await account.createEmailPasswordSession(
            user.email,
            user.password
        );

        return session;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


// ============================== GET ACCOUNT
export async function getAccount() {
    try {
        const currentAccount = await account.get();

        return currentAccount;
    } catch (error) {
        console.log(error);
    }
}



// Get the current user
export async function getCurrentUser() {
    try {
        const currentAccount = await getAccount();

        if (!currentAccount) {
            throw new Error;
        }

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [
                Query.equal("accountId", currentAccount.$id)
            ]
        )

        if (!currentUser) {
            throw new Error("User not found");
        }

        return currentUser.documents[0];
    }
    catch (error) {
        console.error(error);
        return null;
    }
}


// Sign out of the current user account
export async function signOutAccount() {
    try {
        const session = await account.deleteSession("current");

        return session;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}



export async function createPost(post: INewPost) {
    try {

        const uploadedFile: any = await uploadFile(post.file[0]);

        if (!uploadedFile) {
            throw new Error("File upload failed");
        }

        const fileUrl = getFilePreview(uploadedFile?.$id);

        if (!fileUrl) {
            await deleteFile(uploadedFile?.$id);
            throw new Error("File preview failed");
        }

        // convert tags into an array
        const tags = post.tags?.replace(/ /g, '').split(',') || [];

        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadedFile?.$id,
                location: post.location,
                tags: tags,
            }
        );

        if (!newPost) {
            await deleteFile(uploadedFile?.$id);
            throw new Error("Post creation failed");
        }

        return newPost;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function uploadFile(file: File) {
    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file
        )

        return uploadedFile;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
    try {
        const fileUrl = storage.getFilePreview(
            appwriteConfig.storageId,
            fileId,
            2000,
            2000,
        );

        if (!fileUrl) throw Error;

        return fileUrl;
    } catch (error) {
        console.log(error);
    }
}


export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile(
            appwriteConfig.storageId,
            fileId
        )

        return { status: "ok" }
    }
    catch (error) {
        console.error(error);
        return error;
    }
}



export async function getRecentPosts() {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [
                Query.orderDesc("$createdAt"),
                Query.limit(20)
            ]
        )

        if (!posts) {
            throw new Error("No posts found");
        }

        return posts;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
            {
                likes: likesArray
            }
        )

        if (!updatedPost) {
            throw new Error("Post like failed");
        }

        return updatedPost;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function savePost(postId: string, userId: string) {
    try {
        const savedPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            ID.unique(),
            {
                user: userId,
                post: postId,
            }
        )

        if (!savedPost) {
            throw new Error("Post like failed");
        }

        return savedPost;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function deleteSavedPost(savedRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            savedRecordId
        )

        if (!statusCode) {
            throw new Error("Post unlike failed");
        }

        return { status: "ok" };
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function getPostById(postId: string) {
    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )

        return post;
    } catch (error) {
        console.log(error);
        return error;
    }
}


export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;

    try {
        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId
        }

        if (hasFileToUpdate) {
            const uploadedFile: any = await uploadFile(post.file[0]);

            if (!uploadFile) {
                throw new Error("File upload failed");
            }

            const fileUrl = getFilePreview(uploadedFile?.$id);

            if (!fileUrl) {
                await deleteFile(uploadedFile?.$id);
                throw new Error("File preview failed");
            }

            image = { ...image, imageUrl: fileUrl, imageId: uploadedFile?.$id };
        }

        const tags = post?.tags?.replace(/ /g, '').split(',') || [];

        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            post.postId,
            {
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags
            }
        )

        if (!updatedPost) {
            if (hasFileToUpdate) {
                await deleteFile(image.imageId);
            }
            throw new Error("Post update failed");
        }

        if (hasFileToUpdate) {
            await deleteFile(post.imageId);
        }

        return updatedPost;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function deletePost(postId: string, imageId: string) {
    if (!postId || !imageId) {
        throw new Error("Invalid post or image id");
    }

    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )

        return { status: "ok" };
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
    const queries = [Query.orderDesc('$updatedAt'), Query.limit(10)];

    if (pageParam) {
        queries.push(Query.cursorAfter(pageParam.toString()));
    }

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries
        )

        if (!posts) {
            throw new Error("No posts found");
        }

        return posts;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}


export async function searchPosts(searchTerm: string) {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [
                Query.search('caption', searchTerm),
            ]
        )

        if (!posts) {
            throw new Error("No posts found");
        }

        return posts;
    }
    catch (error) {
        console.error(error);
        return error;
    }
}