import Link from "next/link";

import Metric from "../shared/Metric";
import { formatNumber, getTimeStamp } from "@/lib/utils";
import EditDeleteAction from "../shared/EditDeleteAction";

interface Props {
  viewerId?: string | null;
  _id: string;
  question: {
    _id: string;
    title: string;
  };
  author: {
    _id: string;
    name?: string | null;
    email: string;
    picture?: string;
    image?: string | null;
  };
  upvotes: number;
  createdAt: Date;
}

const AnswerCard = ({
  viewerId,
  _id,
  question,
  author,
  upvotes,
  createdAt,
}: Props) => {
  const showActionButtons = viewerId && viewerId === String(author._id);
  return (
    <Link
      href={`/question/${question._id}/#${_id}`}
      className="card-wrapper rounded-[10px] px-11 py-9"
    >
      <div className="flex flex-col-reverse items-start justify-between gap-5 sm:flex-row">
        <div>
          <span className="subtle-regular text-dark400_light700 line-clamp-1 flex sm:hidden">
            {getTimeStamp(createdAt)}
          </span>
          <h3 className="sm:h3-semibold base-semibold text-dark200_light900 line-clamp-1 flex-1">
            {question.title}
          </h3>
        </div>

        {showActionButtons && <EditDeleteAction type="Answer" itemId={String(_id)} />}
      </div>

      <div className="flex-between mt-6 w-full flex-wrap gap-3">
        <Metric
          imgUrl={author.picture || author.image || "/assets/images/default-logo.svg"}
          alt="user avatar"
          value={author.name || author.email.split("@")[0]}
          title={` • asked ${getTimeStamp(createdAt)}`}
          href={`/profile/${author._id}`}
          textStyles="body-medium text-dark400_light700"
          isAuthor
        />

        <div className="flex-center gap-3">
          <Metric
            imgUrl="/assets/icons/like.svg"
            alt="like icon"
            value={formatNumber(upvotes)}
            title=" Votes"
            textStyles="small-medium text-dark400_light800"
          />
        </div>
      </div>
    </Link>
  );
};

export default AnswerCard;
