"use server"

import Thread from "../models/thread.model";
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string,
}



export async function createThread({ text, author, communityId, path }: Params) {
    try {
        connectToDB();

        const createdThread = await Thread.create({
            text,
            author,
            communityId: null,
        });

        // Update user model
        await User.findByIdAndUpdate(author, {
            $push: { threads: createdThread._id }
        })

        revalidatePath(path);
    } 
    catch (error: any) {
        throw new Error(`Error create Thread: ${error.message}`);
    }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();

    // Calculate number of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
        .sort({ creatAt: 'desc' })
        .skip(skipAmount)
        .limit(pageSize)
        .populate({ path: 'author', model: User })
        .populate({
            path: "children", // Populate the children field
            populate: {
              path: "author", // Populate the author field within children
              model: User,
              select: "_id name parentId image", // Select only _id and username fields of the author
            },
          });

    const totalPostsCount = await Thread.countDocuments({ parentId: { $in: [null, undefined] } })

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext }


}

export async function fetchThreadById(id: string) {
    connectToDB();

    try {
        const thread = await Thread.findById(id)
            .populate({ path: 'author', model: User, select: "_id id name image" })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    },
                    {
                        path: 'children',
                        model: Thread,
                        populate: {
                            path: 'author',
                            model: User,
                            select: "_id id name parentId image"
                        }
                    }
                ]
            }).exec();
        return thread;
    } catch (error: any) {
        throw new Error(`Error fetching thread: ${error.message}`);
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string,
    ) {
        connectToDB();

        try {
            //find the original thread by its ID
            const originalThread = await Thread.findById(threadId);
            
            if(!originalThread) {
                throw new Error("Could not find thread")
            }

            //create a new thread with the comment text
            const commentThread = new Thread({
                text: commentText,
                author: userId,
                parentId: threadId
            })


            // Save the new thread
            const savedCommentThread = await commentThread.save();

            //Update the original thread to include the new comment
            originalThread.children.push(savedCommentThread._id);

            //Save the new thread
            await originalThread.save();

            revalidatePath(path);
        } catch (error: any) {
            throw new Error(`Error fetching thread: ${error.message}`)
        }
    }
